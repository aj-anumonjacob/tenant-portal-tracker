// frontend/src/pages/Projects.jsx
import React, { useState } from 'react';
import { FolderPlus, FolderKanban, Check, AlertCircle } from 'lucide-react';
import { api } from '../api';

export default function Projects({ projects, activeProject, setActiveProject, onProjectCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project Name is required.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await api.createProject(name.trim(), description.trim());
      setSuccess('Project workspace initialized successfully!');
      setName('');
      setDescription('');
      
      // Notify parent to reload projects in dropdown
      const newProj = res.data;
      if (onProjectCreated) {
        await onProjectCreated(newProj);
      }
    } catch (e) {
      setError(e.message || 'Failed to create project workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Workspaces Manager</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Initialize new projects and manage tenant workspaces.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }} className="projects-view-grid">
        
        {/* 1. Left side: Create Project Form */}
        <div className="card p-6" style={{ alignSelf: 'flex-start' }}>
          <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderPlus size={20} className="text-muted-color" />
            Create Workspace
          </h3>

          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          
          {success && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Project Name <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Employee Portal onboarding"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a brief overview..."
                rows="3"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Initializing...' : 'Initialize Workspace'}
            </button>
          </form>
        </div>

        {/* 2. Right side: Workspaces Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Existing Project Workspaces ({projects.length})</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }} className="projects-grid-inner">
            {projects.map((proj) => {
              const isActive = activeProject?.id === proj.id;
              
              return (
                <div 
                  key={proj.id}
                  className="card p-5"
                  style={{
                    border: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
                    boxShadow: isActive ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FolderKanban size={18} style={{ color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }} />
                      <span style={{ fontWeight: '800', fontSize: '1.05rem' }}>{proj.name}</span>
                      
                      {isActive && (
                        <span 
                          className="badge badge-registered" 
                          style={{ fontSize: '0.65rem', padding: '0.125rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.125rem' }}
                        >
                          <Check size={10} /> ACTIVE
                        </span>
                      )}
                    </div>
                    {proj.description ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{proj.description}</p>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No overview provided.</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Created: {new Date(proj.created_at).toLocaleDateString()}</span>
                    {!isActive && (
                      <button
                        onClick={() => setActiveProject(proj)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        Activate Workspace
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <style>{`
        @media (min-width: 768px) {
          .projects-grid-inner {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (min-width: 1024px) {
          .projects-view-grid {
            grid-template-columns: 2fr 3fr !important;
          }
        }
      `}</style>
    </div>
  );
}
