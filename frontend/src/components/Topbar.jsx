// frontend/src/components/Topbar.jsx
import React from 'react';
import { Menu, Sun, Moon, LogOut, FolderOpen, User } from 'lucide-react';

export default function Topbar({ 
  projects, 
  activeProject, 
  setActiveProject, 
  theme, 
  toggleTheme, 
  onLogout, 
  setSidebarOpen,
  user
}) {
  return (
    <header 
      className="no-print"
      style={{
        height: '70px',
        backgroundColor: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        transition: 'background-color var(--transition-normal), border var(--transition-normal)'
      }}
    >
      {/* Left side: Hamburger and project selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          className="btn btn-icon btn-secondary"
          onClick={() => setSidebarOpen(prev => !prev)}
          style={{ padding: '8px', borderRadius: '8px' }}
        >
          <Menu size={20} />
        </button>

        {/* Project Selector dropdown */}
        <div 
          className="project-selector-wrapper"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FolderOpen size={18} className="text-muted-color" />
          <select
            value={activeProject?.id || ''}
            onChange={(e) => {
              const selectedProj = projects.find(p => p.id === intval(e.target.value));
              if (selectedProj) setActiveProject(selectedProj);
            }}
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-app)',
              padding: '0.4rem 2rem 0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a1a1aa\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '16px',
              minWidth: '180px',
              transition: 'border-color var(--transition-fast)'
            }}
          >
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right side: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-icon btn-secondary"
          style={{
            padding: '8px',
            borderRadius: '8px',
            color: 'var(--text-secondary)'
          }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* User Card */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.25rem 0.5rem 0.25rem 0.75rem',
            backgroundColor: 'var(--bg-app)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', display: 'none' }} className="user-text-info">
            <span style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
              {user?.full_name || 'Administrator'}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              {user?.role?.toUpperCase() || 'ADMIN'}
            </span>
          </div>
          <div 
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700'
            }}
          >
            <User size={16} />
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="btn btn-icon btn-danger btn-sm"
          style={{
            padding: '8px',
            borderRadius: '8px'
          }}
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>

      <style>{`
        /* Helper function fallback for ES6 modules */
        function intval(val) {
          return parseInt(val, 10) || 0;
        }
        
        @media (min-width: 768px) {
          .user-text-info {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
