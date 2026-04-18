import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, CartesianGrid
} from 'recharts';

import { predictAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';


const COLORS = {
  approved: '#22c55e',
  rejected: '#ef4444',
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444'
};

function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: 8,
      padding: 10
    }}>
      <div>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  const load = useCallback(async () => {
    const [statsRes, histRes] = await Promise.all([
      predictAPI.stats(),
      predictAPI.history(1, 20)
    ]);

    setStats(statsRes.data.stats);
    setHistory(histRes.data.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pieData = stats ? [
    { name: 'Approved', value: stats.approved },
    { name: 'Rejected', value: stats.rejected }
  ] : [];

  const riskBands = history.reduce((acc, r) => {
    acc[r.risk_band] = (acc[r.risk_band] || 0) + 1;
    return acc;
  }, {});

  const riskData = Object.entries(riskBands).map(([name, count]) => ({
    name, count
  }));

  const formattedHistory = history.map(i => ({
    ...i,
    timestamp: new Date(i.timestamp).toLocaleDateString()
  }));

  return (
    <div className="fade-in-up">

      <h2>Welcome, {user?.username}</h2>

      {/* KPI */}
      <div className="stats-grid">
        <StatCard label="Total" value={stats?.total || 0} icon="📊" color="#3b82f6" />
        <StatCard label="Approved" value={stats?.approved || 0} icon="✅" color="#22c55e" />
        <StatCard label="Rejected" value={stats?.rejected || 0} icon="❌" color="#ef4444" />
        <StatCard label="Avg Risk" value={`${stats?.avg_risk_score || 0}%`} icon="⚠" color="#f59e0b" />
      </div>

      {/* Charts */}
      <div className="grid-2">

        <div className="card">
          <h3>Decision Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value">
                <Cell fill={COLORS.approved}/>
                <Cell fill={COLORS.rejected}/>
              </Pie>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={riskData}>
              <XAxis dataKey="name"/>
              <YAxis/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="count">
                {riskData.map(r => (
                  <Cell key={r.name}
                    fill={
                      r.name === 'Low' ? COLORS.low :
                      r.name === 'Medium' ? COLORS.medium :
                      COLORS.high
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LINE */}
      <div className="card">
        <h3>Risk Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedHistory}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="timestamp"/>
            <YAxis/>
            <Tooltip content={<CustomTooltip/>}/>
            <Line dataKey="risk_score" stroke="#3b82f6"/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* TABLE */}
      <div className="card">
        <h3>Recent Records</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Decision</th>
              <th>Risk</th>
              <th>Confidence</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {history.map(r => (
              <tr key={r._id}>
                <td>{r._id?.slice(-5)}</td>
                <td className={r.prediction === 'Approved' ? 'risk-low' : 'risk-high'}>
                  {r.prediction}
                </td>
                <td>{r.risk_score}%</td>
                <td>{r.confidence}%</td>
                <td>{new Date(r.timestamp).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}