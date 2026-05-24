// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin'); // pre-fill for ease of testing
  const [password, setPassword] = useState('admin123'); // pre-fill for ease of testing
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await api.login(username, password);
      // Store token and user details
      localStorage.setItem('tenant_tracker_token', res.data.token);
      localStorage.setItem('tenant_tracker_user', JSON.stringify({
        user_id: res.data.user_id,
        username: res.data.username,
        email: res.data.email,
        full_name: res.data.full_name,
        role: res.data.role
      }));
      
      onLoginSuccess(res.data);
    } catch (e) {
      setError(e.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, hsl(222, 47%, 6%) 0%, hsl(250, 45%, 15%) 100%)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background glowing circles */}
      <div 
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, hsla(250, 85%, 65%, 0.15) 0%, rgba(0,0,0,0) 70%)',
          top: '-10%',
          right: '-10%',
          zIndex: 1
        }}
      />
      <div 
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, hsla(180, 80%, 45%, 0.1) 0%, rgba(0,0,0,0) 70%)',
          bottom: '-15%',
          left: '-10%',
          zIndex: 1
        }}
      />

      {/* Login Box */}
      <div 
        className="glass-card p-8 animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '420px',
          borderRadius: 'var(--radius-xl)',
          zIndex: 10,
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div 
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--border-focus) 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-glow)',
              marginBottom: '1rem'
            }}
          >
            <ShieldCheck size={36} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.025em', marginBottom: '0.25rem' }}>
            ClickUp Workspace
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>
            Sign in to track Tenant Portal registration
          </p>
        </div>

        {error && (
          <div 
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-md)',
              color: '#f87171',
              fontSize: '0.85rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ color: 'var(--text-secondary)' }}>
              Username
            </label>
            <input 
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              required
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input 
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.95rem',
              fontWeight: '700'
            }}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              'Authenticate Securely'
            )}
          </button>
        </form>

        <div 
          style={{
            marginTop: '1.75rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            paddingTop: '1.25rem'
          }}
        >
          <strong>Demo Credentials Auto-filled:</strong> admin / admin123<br />
          Production setup includes secure hashed passwords.
        </div>
      </div>
    </div>
  );
}
