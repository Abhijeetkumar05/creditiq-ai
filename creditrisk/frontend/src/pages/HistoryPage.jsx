import React, { useState, useEffect, useCallback } from 'react';
import { predictAPI } from '../services/api';

function RiskBar({ score, band }) {
  const color = band === 'Low' ? '#22c55e' : band === 'Medium' ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="risk-bar-track" style={{ width: 56 }}>
        <div className="risk-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{score}%</span>
    </div>
  );
}

export default function HistoryPage() {
  const [records, setRecords]   = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const perPage = 10;

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await predictAPI.history(page, perPage);
      let rows = data.data || [];
      if (filter !== 'all') rows = rows.filter(r => r.prediction === filter);
      setRecords(rows);
      setPagination(data.pagination || { page: 1, pages: 1, total: rows.length });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(1); }, [load]);

  const handlePage = (p) => load(p);

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <h1 className="page-title">◷ Assessment History</h1>
        <p className="page-subtitle">Complete log of all credit risk evaluations</p>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">◈ All Records <span className="badge badge-muted" style={{ marginLeft: 8 }}>{pagination.total}</span></span>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'Approved', 'Rejected'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(f)}
              >{f}</button>
            ))}
          </div>
        </div>

        <div className="table-scroll">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            </div>
          ) : records.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Decision</th>
                  <th>Risk Score</th>
                  <th>Risk Band</th>
                  <th>Confidence</th>
                  <th>Income</th>
                  <th>Loan Amt</th>
                  <th>Credit Score</th>
                  <th>Model</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map(row => (
                  <tr key={row._id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      #{row._id?.slice(-6).toUpperCase()}
                    </td>
                    <td>
                      <span className={`badge ${row.prediction === 'Approved' ? 'badge-success' : 'badge-danger'}`}>
                        {row.prediction}
                      </span>
                    </td>
                    <td><RiskBar score={row.risk_score} band={row.risk_band} /></td>
                    <td>
                      <span className={`badge ${row.risk_band === 'Low' ? 'badge-success' : row.risk_band === 'Medium' ? 'badge-warning' : 'badge-danger'}`}>
                        {row.risk_band}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.confidence}%</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      ${row.input_data?.annual_income?.toLocaleString() ?? '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      ${row.input_data?.loan_amount?.toLocaleString() ?? '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {row.input_data?.credit_score ?? '—'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.model_used?.split(' ')[0]}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {row.timestamp ? new Date(row.timestamp).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">◎</div>
              <p>No records found. <a href="/predict" style={{ color: 'var(--accent)' }}>Run your first assessment →</a></p>
            </div>
          )}
        </div>

        {pagination.pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => handlePage(pagination.page - 1)} disabled={!pagination.has_prev}>‹</button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1)
              .filter(p => Math.abs(p - pagination.page) <= 2)
              .map(p => (
                <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => handlePage(p)}>{p}</button>
              ))}
            <button className="page-btn" onClick={() => handlePage(pagination.page + 1)} disabled={!pagination.has_next}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}
