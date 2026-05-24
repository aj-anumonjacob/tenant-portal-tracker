// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import KanbanBoard from './pages/KanbanBoard';
import Reports from './pages/Reports';
import ProjectSettings from './pages/ProjectSettings';
import Projects from './pages/Projects';
import { api } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // 1. Initial Authentication & Theme Check
  useEffect(() => {
    // Check auth
    const storedUser = localStorage.getItem('tenant_tracker_user');
    const storedToken = localStorage.getItem('tenant_tracker_token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    
    // Check theme
    const storedTheme = localStorage.getItem('tenant_tracker_theme') || 'dark'; // Dark mode default looks stunning
    setTheme(storedTheme);
    document.documentElement.setAttribute('data-theme', storedTheme);
    
    setAppReady(true);
  }, []);

  // 2. Load Projects list after authentication
  const loadProjectsList = async (activateFirst = false) => {
    try {
      const res = await api.getProjects();
      setProjects(res.data);
      
      if (res.data.length > 0) {
        // If activateFirst or no active project is set, default to Tenant Portal (id: 1) or the first project
        if (activateFirst || !activeProject) {
          const defaultProj = res.data.find(p => p.id === 1) || res.data[0];
          setActiveProject(defaultProj);
        } else {
          // Keep current active project selection but refresh metadata
          const current = res.data.find(p => p.id === activeProject.id);
          if (current) setActiveProject(current);
        }
      }
    } catch (e) {
      console.error('Failed to load projects list:', e);
    }
  };

  useEffect(() => {
    if (user) {
      loadProjectsList(true);
    }
  }, [user]);

  // 3. Listen to auth failures from API helper
  useEffect(() => {
    const handleAuthFailed = () => {
      setUser(null);
      setActiveProject(null);
      setProjects([]);
      setCurrentPage('dashboard');
    };
    
    window.addEventListener('auth-failed', handleAuthFailed);
    return () => window.removeEventListener('auth-failed', handleAuthFailed);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('tenant_tracker_token');
    localStorage.removeItem('tenant_tracker_user');
    setUser(null);
    setActiveProject(null);
    setProjects([]);
    setCurrentPage('dashboard');
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('tenant_tracker_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleProjectCreated = async (newProj) => {
    await loadProjectsList(false);
    // Switch to new project immediately
    setActiveProject(newProj);
  };

  // Wait for initial theme check
  if (!appReady) return null;

  // Render Login page if not authenticated
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render Page Content Switcher
  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard projectId={activeProject?.id} />;
      case 'tasks':
        return <TaskList projectId={activeProject?.id} />;
      case 'kanban':
        return <KanbanBoard projectId={activeProject?.id} />;
      case 'reports':
        return <Reports projectId={activeProject?.id} />;
      case 'project-settings':
        return (
          <ProjectSettings 
            activeProject={activeProject} 
            onFieldsUpdated={() => loadProjectsList(false)}
          />
        );
      case 'projects':
        return (
          <Projects 
            projects={projects} 
            activeProject={activeProject} 
            setActiveProject={setActiveProject}
            onProjectCreated={handleProjectCreated}
          />
        );
      default:
        return <Dashboard projectId={activeProject?.id} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      
      {/* Sidebar Navigation */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
      />

      {/* Main Panel Wrapper */}
      <div 
        className="main-content"
        style={{
          flex: 1,
          marginLeft: '0', // Full width on mobile/tablet (absolute sidebar overlays)
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0, // Prevent table flex overflow
          transition: 'margin-left var(--transition-normal)'
        }}
      >
        {/* Top bar control menu */}
        <Topbar 
          projects={projects} 
          activeProject={activeProject} 
          setActiveProject={setActiveProject} 
          theme={theme} 
          toggleTheme={toggleTheme} 
          onLogout={handleLogout} 
          setSidebarOpen={setSidebarOpen}
          user={user}
        />

        {/* Dynamic page render slot */}
        <main 
          style={{
            flex: 1,
            padding: '1.5rem',
            overflowY: 'auto'
          }}
        >
          {activeProject ? (
            renderPageContent()
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
              No project workspaces found. Go to Workspace Manager to initialize a project.
            </div>
          )}
        </main>
      </div>

      <style>{`
        /* Shift content layout on large screens to make space for static sidebar */
        @media (min-width: 1024px) {
          .main-content {
            margin-left: 260px !important;
          }
        }
      `}</style>
    </div>
  );
}
