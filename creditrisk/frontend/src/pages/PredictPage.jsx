import React, { useState } from 'react';
import { predictAPI } from '../services/api';
import jsPDF from 'jspdf';

const DEFAULTS = {
  age: '', annual_income: '', loan_amount: '', loan_term: '36',
  credit_score: '', employment_years: '', num_credit_lines: '6',
  debt_to_income_ratio: '', num_derogatory_marks: '0',
  employment_status: 'Employed', education_level: 'Bachelor',
  home_ownership: 'Rent', loan_purpose: 'Debt Consolidation',
};

const FIELD_META = {
  age:                    { label: 'Age',                    type: 'number', placeholder: '35',        min: 18, max: 80 },
  annual_income:          { label: 'Annual Income ($)',       type: 'number', placeholder: '75000',     min: 1000 },
  loan_amount:            { label: 'Loan Amount ($)',         type: 'number', placeholder: '25000',     min: 500 },
  loan_term:              { label: 'Loan Term (months)',      type: 'select', options: ['12','24','36','48','60','84'] },
  credit_score:           { label: 'Credit Score',           type: 'number', placeholder: '720',       min: 300, max: 850 },
  employment_years:       { label: 'Years Employed',         type: 'number', placeholder: '5',         min: 0, max: 50 },
  num_credit_lines:       { label: 'Number of Credit Lines', type: 'number', placeholder: '6',         min: 0 },
  debt_to_income_ratio:   { label: 'Debt-to-Income Ratio',   type: 'number', placeholder: '0.30',      min: 0, max: 2, step: 0.01 },
  num_derogatory_marks:   { label: 'Derogatory Marks',       type: 'number', placeholder: '0',         min: 0, max: 20 },
  employment_status:      { label: 'Employment Status',      type: 'select', options: ['Employed','Self-Employed','Part-Time','Unemployed'] },
  education_level:        { label: 'Education Level',        type: 'select', options: ['High School','Associate','Bachelor','Master','PhD'] },
  home_ownership:         { label: 'Home Ownership',         type: 'select', options: ['Rent','Own','Mortgage','Other'] },
  loan_purpose:           { label: 'Loan Purpose',           type: 'select', options: ['Debt Consolidation','Home Improvement','Business','Education','Medical','Other'] },
};

function ResultPanel({ result }) {
  const isApproved = result.prediction === 'Approved';
  const factorColor = { positive: '#22c55e', neutral: '#f59e0b', negative: '#ef4444' };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(8, 12, 20);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(226, 234, 244);
    doc.setFontSize(20);
    doc.text('CreditIQ — Loan Assessment Report', 15, 25);
    doc.setFontSize(11);
    doc.setTextColor(127, 168, 204);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 35);
    doc.setFontSize(14);
    doc.setTextColor(isApproved ? 34 : 239, isApproved ? 197 : 68, isApproved ? 94 : 68);
    doc.text(`Decision: ${result.prediction}`, 15, 52);
    doc.setTextColor(226, 234, 244);
    doc.setFontSize(11);
    doc.text(`Risk Score: ${result.risk_score}% (${result.risk_band})`, 15, 62);
    doc.text(`Confidence: ${result.confidence}%`, 15, 72);
    doc.text(`Approval Probability: ${result.prob_approved}%`, 15, 82);
    doc.text(`Model: ${result.model_used} (AUC: ${result.model_auc})`, 15, 92);
    doc.setFontSize(12);
    doc.text('Key Risk Factors:', 15, 108);
    result.key_factors?.forEach((f, i) => {
      doc.setFontSize(10);
      const sign = f.impact === 'positive' ? '+' : f.impact === 'negative' ? '-' : '~';
      doc.text(`  ${sign} ${f.factor}: ${f.value}`, 15, 120 + i * 10);
    });
    doc.save(`CreditIQ_Assessment_${result.record_id?.slice(-6) || 'report'}.pdf`);
  };

  return (
    <div className={`result-panel ${isApproved ? 'approved' : 'rejected'} fade-in-up`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 2, textTransform: 'uppercase' }}>Assessment Result</div>
          <div className={`result-verdict ${isApproved ? 'approved' : 'rejected'}`}>
            {isApproved ? '✓ APPROVED' : '✕ REJECTED'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Confidence: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{result.confidence}%</span>
            &nbsp;·&nbsp; Model: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{result.model_used}</span>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={downloadPDF}>⬇ PDF Report</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Risk Score</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: result.risk_color }}>{result.risk_score}%</span>
        </div>
        <div className="risk-bar-track">
          <div className="risk-bar-fill" style={{ width: `${result.risk_score}%`, background: `linear-gradient(90deg, var(--accent), ${result.risk_color})` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>0% (Safe)</span>
          <span className={`badge ${result.risk_band === 'Low' ? 'badge-success' : result.risk_band === 'Medium' ? 'badge-warning' : 'badge-danger'}`}>{result.risk_label}</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>100% (Critical)</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Approval Probability', value: result.prob_approved, color: '#22c55e' },
          { label: 'Rejection Probability', value: result.prob_rejected, color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '14px 18px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: -1 }}>{value}%</div>
          </div>
        ))}
      </div>

      {result.key_factors?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Key Risk Factors</div>
          {result.key_factors.map((f, i) => (
            <div key={i} className="factor-item">
              <div className="factor-dot" style={{ background: factorColor[f.impact] }} />
              <div className="factor-name">{f.factor}</div>
              <div className="factor-value">{f.value}</div>
              <span className={`badge badge-${f.impact === 'positive' ? 'success' : f.impact === 'negative' ? 'danger' : 'warning'}`} style={{ fontSize: 10 }}>
                {f.impact}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PredictPage() {
  const [form, setForm]     = useState(DEFAULTS);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const numericFields = ['age', 'annual_income', 'loan_amount', 'loan_term', 'credit_score',
        'employment_years', 'num_credit_lines', 'debt_to_income_ratio', 'num_derogatory_marks'];
      const payload = { ...form };
      numericFields.forEach(f => { if (payload[f] !== '') payload[f] = Number(payload[f]); });
      const { data } = await predictAPI.predict(payload);
      setResult(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const details = err.response?.data?.details;
      setError(details ? details.join(', ') : err.response?.data?.error || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setForm(DEFAULTS); setResult(null); setError(''); };

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <h1 className="page-title">⚡ New Credit Assessment</h1>
        <p className="page-subtitle">Submit applicant data to receive an AI-powered risk evaluation</p>
      </div>

      {result && <ResultPanel result={result} />}
      {result && <div style={{ height: 24 }} />}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠ {error}</div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">◈ Applicant Information</span>
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>Reset Form</button>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>
              Financial Profile
            </div>
            <div className="form-grid" style={{ marginBottom: 24 }}>
              {['age','annual_income','loan_amount','loan_term','credit_score','employment_years','num_credit_lines','debt_to_income_ratio','num_derogatory_marks'].map(key => {
                const m = FIELD_META[key];
                return (
                  <div className="form-group" key={key}>
                    <label htmlFor={key}>{m.label}</label>
                    {m.type === 'select' ? (
                      <select id={key} name={key} value={form[key]} onChange={handleChange}>
                        {m.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        id={key} name={key} type="number"
                        placeholder={m.placeholder}
                        min={m.min} max={m.max} step={m.step || 1}
                        value={form[key]} onChange={handleChange}
                        required={['age','annual_income','loan_amount','credit_score'].includes(key)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>
              Personal Profile
            </div>
            <div className="form-grid" style={{ marginBottom: 32 }}>
              {['employment_status','education_level','home_ownership','loan_purpose'].map(key => {
                const m = FIELD_META[key];
                return (
                  <div className="form-group" key={key}>
                    <label htmlFor={key}>{m.label}</label>
                    <select id={key} name={key} value={form[key]} onChange={handleChange}>
                      {m.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={handleReset}>Clear</button>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" /> Analyzing…</> : '⚡ Run Assessment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}