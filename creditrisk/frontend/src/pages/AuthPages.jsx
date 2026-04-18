import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Alert({ type, children }) {
  return <div className={`alert alert-${type}`}><span>⚠</span><span>{children}</span></div>;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]     = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    setError('');
    try {
      await login({ username: 'demo', password: 'demo1234' });
      navigate('/dashboard');
    } catch {
      // If demo user doesn't exist, just navigate (guest mode)
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-grid" />
      <div className="auth-bg-glow" />
      <div className="auth-card fade-in-up">
        <div className="logo-mark" style={{ marginBottom: 28 }}>
          <div className="logo-icon">💳</div>
          <div>
            <div className="logo-text">CreditIQ</div>
            <div className="logo-sub">Risk Intelligence Platform</div>
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your analyst dashboard</p>

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label htmlFor="username">Username or Email</label>
            <input
              id="username" name="username" type="text"
              placeholder="analyst@bank.com"
              value={form.username} onChange={handleChange}
              autoFocus required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 22 }}>
            <label htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password"
              placeholder="••••••••"
              value={form.password} onChange={handleChange}
              required
            />
          </div>
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : '→'} {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          OR
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <button className="btn btn-secondary btn-full" onClick={handleDemo} disabled={loading}>
          🎯 Continue with Demo Account
        </button>

        <div className="auth-link">
          Don't have an account? <Link to="/signup">Create one</Link>
        </div>
      </div>
    </div>
  );
}

export function SignupPage() {
  const { signup } = useAuth();
  const navigate    = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', confirm: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await signup(form);
      navigate('/dashboard');
    } catch (err) {
      const details = err.response?.data?.details;
      setError(details ? details.join('. ') : err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-grid" />
      <div className="auth-bg-glow" />
      <div className="auth-card fade-in-up">
        <div className="logo-mark" style={{ marginBottom: 28 }}>
          <div className="logo-icon">💳</div>
          <div>
            <div className="logo-text">CreditIQ</div>
            <div className="logo-sub">Risk Intelligence Platform</div>
          </div>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Join the CreditIQ analyst network</p>

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          {[
            { name: 'full_name',  label: 'Full Name',       type: 'text',     placeholder: 'Jane Smith' },
            { name: 'username',   label: 'Username',        type: 'text',     placeholder: 'jsmith_analyst' },
            { name: 'email',      label: 'Work Email',      type: 'email',    placeholder: 'jane@bank.com' },
            { name: 'password',   label: 'Password',        type: 'password', placeholder: '8+ characters' },
            { name: 'confirm',    label: 'Confirm Password',type: 'password', placeholder: '••••••••' },
          ].map(({ name, label, type, placeholder }) => (
            <div className="form-group" style={{ marginBottom: 14 }} key={name}>
              <label htmlFor={name}>{label}</label>
              <input
                id={name} name={name} type={type}
                placeholder={placeholder}
                value={form[name]} onChange={handleChange}
                required
              />
            </div>
          ))}
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <span className="spinner" /> : '✓'} {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
