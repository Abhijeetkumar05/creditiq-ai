import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV = [
  { path: '/dashboard',  icon: '◈', label: 'Overview' },
  { path: '/predict',    icon: '⚡', label: 'New Assessment' },
  { path: '/history',    icon: '◷', label: 'History' },
  { path: '/analytics',  icon: '◉', label: 'Analytics' },
  { path: '/model-info', icon: '◎', label: 'Model Info' },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">💳</div>
            <div>
              <div className="logo-text">CreditIQ</div>
              <div className="logo-sub">Risk Intelligence</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Platform</div>
          {NAV.map(({ path, icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`nav-item ${location.pathname === path ? 'active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip" onClick={handleLogout} title="Click to logout">
            <div className="avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.username || 'Guest'}</div>
              <div className="user-role">Credit Analyst</div>
            </div>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>↪</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
