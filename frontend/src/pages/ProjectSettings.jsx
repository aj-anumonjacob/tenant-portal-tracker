// frontend/src/pages/ProjectSettings.jsx
import React from 'react';
import { Settings, Info } from 'lucide-react';
import FieldBuilder from '../components/FieldBuilder';

export default function ProjectSettings({ activeProject, onFieldsUpdated }) {
  if (!activeProject) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No project selected. Switch projects in the top bar or create one in Projects Manager.
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Field Builder Settings</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Define custom form structures and EAV input configurations for this project.</p>
      </div>

      {/* Project Meta Information Card */}
      <div className="card p-5" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={18} className="text-muted-color" />
          Active Project: {activeProject.name}
        </h3>
        {activeProject.description ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{activeProject.description}</p>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No description configured for this project workspace.</p>
        )}
        
        <div 
          style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}
        >
          <Info size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
          <span>
            Adding or deleting custom fields immediately transforms the data forms and table columns in the Tasks database. Values already stored under edited fields remain preserved based on field IDs.
          </span>
        </div>
      </div>

      {/* Mounting Custom Fields Config Builder */}
      <FieldBuilder 
        projectId={activeProject.id} 
        onFieldsUpdated={onFieldsUpdated}
      />
    </div>
  );
}
