// frontend/src/components/Sidebar.jsx
import React from 'react';
import { 
  LayoutDashboard, 
  ListTodo, 
  Columns, 
  FileSpreadsheet, 
  Settings, 
  FolderGit2,
  X 
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen }) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', name: 'Tasks List', icon: ListTodo },
    { id: 'kanban', name: 'Kanban Board', icon: Columns },
    { id: 'reports', name: 'Reports Generator', icon: FileSpreadsheet },
    { id: 'project-settings', name: 'Field Builder', icon: Settings },
    { id: 'projects', name: 'Projects Manager', icon: FolderGit2 },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 40
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className="no-print"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '260px',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
          zIndex: 50,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform var(--transition-normal), background-color var(--transition-normal)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Sidebar Header */}
        <div 
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--border-focus) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '1.2rem',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              C
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: '800', fontSize: '1.1rem', letterSpacing: '-0.025em' }}>ClickUp</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>REGISTRATION PORTAL</span>
            </div>
          </div>
          
          {/* Close button on mobile */}
          <button 
            className="btn btn-icon btn-secondary"
            style={{ 
              display: 'none', 
              padding: '4px',
              borderRadius: '6px'
            }}
            onClick={() => setIsOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <nav style={{ padding: '1.5rem 1rem', flex: 1, overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setCurrentPage(item.id);
                      setIsOpen(false); // Close sidebar on mobile select
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: isActive ? '700' : '500',
                      transition: 'background-color var(--transition-fast), color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{item.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer Info */}
        <div 
          style={{
            padding: '1.25rem',
            borderTop: '1px solid var(--border)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            fontWeight: '500'
          }}
        >
          v1.0.0 Production Ready
        </div>
      </aside>

      {/* Adjust screen layouts on Desktop to show sidebar standard */}
      <style>{`
        @media (min-width: 1024px) {
          aside {
            transform: translateX(0) !important;
          }
          .btn-icon {
            display: none !important;
          }
        }
        @media (max-width: 1023px) {
          aside .btn-icon {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
