import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { predictAPI } from '../services/api';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill || '#93c5fd' }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</div>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const [stats, setStats]   = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([predictAPI.stats(), predictAPI.history(1, 50)])
      .then(([s, h]) => { setStats(s.data.stats); setHistory(h.data.data || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  // Group by date
  const byDate = history.reduce((acc, r) => {
    const d = r.timestamp ? new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown';
    if (!acc[d]) acc[d] = { date: d, approved: 0, rejected: 0 };
    acc[d][r.prediction === 'Approved' ? 'approved' : 'rejected']++;
    return acc;
  }, {});
  const timelineData = Object.values(byDate).slice(-14);

  // Risk score distribution buckets
  const riskBuckets = [0,10,20,30,40,50,60,70,80,90].map(bucket => ({
    range: `${bucket}-${bucket+10}`,
    count: history.filter(r => r.risk_score >= bucket && r.risk_score < bucket + 10).length,
  }));

  // Credit score vs approval
  const creditBuckets = ['300-500','500-600','600-650','650-700','700-750','750-800','800+'];
  const creditData = creditBuckets.map(b => {
    const [lo, hi] = b.split('-').map(Number);
    const relevant = history.filter(r => {
      const cs = r.input_data?.credit_score;
      if (b === '800+') return cs >= 800;
      return cs >= lo && cs < hi;
    });
    return {
      range: b,
      approved: relevant.filter(r => r.prediction === 'Approved').length,
      rejected: relevant.filter(r => r.prediction !== 'Approved').length,
    };
  }).filter(d => d.approved + d.rejected > 0);

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <h1 className="page-title">◉ Analytics</h1>
        <p className="page-subtitle">Portfolio-level credit risk insights</p>
      </div>

      {history.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">◎</div>
          <p>No data to analyze yet. <a href="/predict" style={{ color: 'var(--accent)' }}>Run some assessments →</a></p>
        </div></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">◷ Decision Timeline</span></div>
              <div className="card-body" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="approved" fill="#22c55e" radius={[3,3,0,0]} name="Approved" />
                    <Bar dataKey="rejected" fill="#ef4444" radius={[3,3,0,0]} name="Rejected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">◈ Risk Score Distribution</span></div>
              <div className="card-body" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskBuckets} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="range" tick={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Applications" radius={[3,3,0,0]}>
                      {riskBuckets.map((entry, i) => {
                        const pct = (entry.range.split('-')[0]) / 100;
                        const color = pct < 0.3 ? '#22c55e' : pct < 0.6 ? '#f59e0b' : '#ef4444';
                        return <Cell key={i} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {creditData.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">◎ Credit Score vs Decision</span></div>
              <div className="card-body" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={creditData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="range" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="approved" fill="#22c55e" radius={[3,3,0,0]} name="Approved" />
                    <Bar dataKey="rejected" fill="#ef4444" radius={[3,3,0,0]} name="Rejected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ModelInfoPage() {
  const [info, setInfo]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    predictAPI.modelInfo()
      .then(r => setInfo(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  const models = info?.model_comparison
    ? Object.entries(info.model_comparison).map(([name, m]) => ({ name: name.split(' ').slice(-1)[0], full: name, ...m }))
    : [];

  const importanceData = info?.feature_importance
    ? Object.entries(info.feature_importance).slice(0, 10).map(([name, val]) => ({
        name: name.replace(/_/g, ' ').replace('employment status ', '').slice(0, 18),
        value: val,
      }))
    : [];

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <h1 className="page-title">◎ Model Intelligence</h1>
        <p className="page-subtitle">Trained ML model performance and feature analysis</p>
      </div>

      {/* Best model banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(6,182,212,0.06))', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Active Model</div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, marginBottom: 4 }}>{info?.best_model}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Selected by highest cross-validation AUC score</div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { label: 'Accuracy', value: `${(info?.accuracy * 100).toFixed(1)}%` },
            { label: 'F1 Score', value: (info?.f1_score).toFixed(3) },
            { label: 'AUC-ROC', value: (info?.auc_score).toFixed(3) },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', letterSpacing: -0.5 }}>{value}</div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Model comparison */}
        <div className="card">
          <div className="card-header"><span className="card-title">◈ Model Comparison</span></div>
          <div className="card-body" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={models} layout="vertical" margin={{ top: 4, right: 16, left: 20, bottom: 0 }}>
                <XAxis type="number" domain={[0.9, 1]} tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} tickFormatter={v => v.toFixed(2)} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-secondary)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="auc" name="AUC" fill="var(--accent)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature importance */}
        <div className="card">
          <div className="card-header"><span className="card-title">◎ Feature Importance (RF)</span></div>
          <div className="card-body" style={{ height: 260 }}>
            {importanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={importanceData} layout="vertical" margin={{ top: 4, right: 16, left: 20, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} tickFormatter={v => v.toFixed(2)} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: 'var(--text-secondary)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Importance" radius={[0,4,4,0]}>
                    {importanceData.map((_, i) => (
                      <Cell key={i} fill={`hsl(${210 - i * 8}, 70%, ${60 - i * 2}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><div className="empty-icon">◎</div><p>Feature importance not available</p></div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed model table */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="card-title">◷ Full Benchmark Results</span></div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Model</th><th>Accuracy</th><th>F1 Score</th><th>AUC-ROC</th><th>CV-AUC</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(info?.model_comparison || {}).map(([name, m]) => (
              <tr key={name}>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{name}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{(m.accuracy * 100).toFixed(1)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{m.f1.toFixed(3)}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{m.auc.toFixed(3)}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{m.cv_auc.toFixed(3)}</td>
                <td>
                  {name === info?.best_model
                    ? <span className="badge badge-success">✓ Active</span>
                    : <span className="badge badge-muted">Standby</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
