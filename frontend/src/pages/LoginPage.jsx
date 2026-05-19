import React, { useState } from 'react';
import { useAuth } from '../App.jsx';
import { api } from '../api/client.js';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      login(token);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="card-body">
          <h1>PartTrack</h1>
          <p className="subtitle">Robot station parts inventory</p>

          {error && <div className="banner banner-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@parttrack.dev"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: '12px', background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#6b7280' }}>
            <strong>Demo accounts</strong><br />
            admin@parttrack.dev / admin123<br />
            alpha@parttrack.dev / delegate123<br />
            beta@parttrack.dev / delegate123
          </div>
        </div>
      </div>
    </div>
  );
}
