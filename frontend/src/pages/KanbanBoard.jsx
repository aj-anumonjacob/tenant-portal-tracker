// frontend/src/pages/KanbanBoard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  Home, 
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { api } from '../api';

export default function KanbanBoard({ projectId }) {
  const [columns, setColumns] = useState({
    'To Do': [],
    'In Progress': [],
    'Completed': []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Drag state
  const [draggingTaskId, setDraggingTaskId] = useState(null);

  const loadKanbanData = async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getKanbanData(projectId);
      setColumns(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKanbanData();
  }, [projectId]);

  // HTML5 Drag-and-Drop Handlers
  const handleDragStart = (e, taskId) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow dropping
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    const taskId = parseInt(taskIdStr, 10);
    
    if (isNaN(taskId) || !draggingTaskId) return;
    
    // Find task's current column
    let sourceStatus = '';
    Object.keys(columns).forEach(col => {
      if (columns[col].some(t => t.id === taskId)) {
        sourceStatus = col;
      }
    });
    
    // If dropped in the same column, do nothing
    if (sourceStatus === targetStatus) return;

    // Optimistically update frontend columns for ultra-smooth UI response!
    const sourceList = [...columns[sourceStatus]];
    const targetList = [...columns[targetStatus]];
    const taskIndex = sourceList.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) return;
    
    const [movedTask] = sourceList.splice(taskIndex, 1);
    movedTask.task_status = targetStatus;
    targetList.unshift(movedTask); // Add to top of target column
    
    setColumns(prev => ({
      ...prev,
      [sourceStatus]: sourceList,
      [targetStatus]: targetList
    }));

    try {
      // Trigger API update
      await api.updateTaskColumn(taskId, targetStatus);
    } catch (err) {
      alert(`Failed to update task column: ${err.message}`);
      // Revert in case of API failure
      loadKanbanData();
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteTask(taskId);
      await loadKanbanData();
    } catch (e) {
      alert(e.message);
    }
  };

  // Status Badge Mapper
  const renderCardBadge = (fieldKey, value) => {
    if (!value) return null;
    
    if (fieldKey === 'portal_status') {
      const cls = value === 'Registered' ? 'badge-registered' : (value === 'Pending' ? 'badge-pending' : 'badge-not-registered');
      return <span className={`badge ${cls}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>{value}</span>;
    }
    
    if (fieldKey === 'call_status') {
      const clsMap = {
        'Completed': 'badge-call-completed',
        'Follow-up Needed': 'badge-call-followup',
        'Call Not Picked Up': 'badge-call-not-picked',
        'Re-scheduled': 'badge-call-rescheduled',
        'Facing Issue in Registration': 'badge-call-issue',
        'Invalid Number': 'badge-call-invalid'
      };
      return <span className={`badge ${clsMap[value] || ''}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>{value}</span>;
    }
    
    return null;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'calc(100vh - 120px)' }}>
      
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Kanban Board</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Drag and drop cards between status columns to update tasks instantly.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          Loading Kanban lanes...
        </div>
      ) : (
        /* Board Columns Wrapper */
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            alignItems: 'stretch',
            flex: 1,
            overflowY: 'hidden',
            paddingBottom: '1rem'
          }}
          className="kanban-board-grid"
        >
          {Object.keys(columns).map((status) => {
            const list = columns[status] || [];
            
            // Border glow matching status column
            const headerColor = status === 'Completed' 
              ? 'var(--success)' 
              : (status === 'In Progress' ? 'var(--info)' : 'var(--text-muted)');
            
            const colBg = status === 'Completed'
              ? 'var(--kanban-completed)'
              : (status === 'In Progress' ? 'var(--kanban-progress)' : 'var(--kanban-todo)');
              
            return (
              <div 
                key={status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
                style={{
                  backgroundColor: colBg,
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem',
                  maxHeight: '100%',
                  overflowY: 'auto'
                }}
              >
                {/* Column Header */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '0.5rem',
                    borderBottom: `2px solid ${headerColor}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '800' }}>{status}</h3>
                    <span 
                      style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--bg-card)',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        border: '1px solid var(--border)'
                      }}
                    >
                      {list.length}
                    </span>
                  </div>
                </div>

                {/* Cards List */}
                <div 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    flex: 1,
                    minHeight: '200px'
                  }}
                >
                  {list.length === 0 ? (
                    <div 
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '2rem 1rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        textAlign: 'center'
                      }}
                    >
                      <ClipboardList size={24} style={{ opacity: 0.4, marginBottom: '0.25rem' }} />
                      Drop cards here
                    </div>
                  ) : (
                    list.map((task) => {
                      const isDragged = task.id === draggingTaskId;
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className="card p-4 animate-fade-in"
                          style={{
                            cursor: 'grab',
                            opacity: isDragged ? 0.4 : 1,
                            backgroundColor: 'var(--bg-card)',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid var(--border)',
                            position: 'relative'
                          }}
                        >
                          {/* Unit and Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <Home size={14} className="text-muted-color" />
                              <span style={{ fontWeight: '800', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                {task.unit_number ? `Unit ${task.unit_number}` : `Task #${task.id}`}
                              </span>
                            </div>
                            <button 
                              className="btn btn-secondary btn-icon btn-sm"
                              onClick={() => handleDelete(task.id)}
                              style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent' }}
                              title="Delete Card"
                            >
                              <Trash2 size={12} style={{ color: 'var(--danger)' }} />
                            </button>
                          </div>

                          {/* Tenant Info */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
                            {task.tenant_name && (
                              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                {task.tenant_name}
                              </span>
                            )}
                            {task.phone_number && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <Phone size={10} />
                                <span>{task.phone_number}</span>
                              </div>
                            )}
                          </div>

                          {/* Custom Badges row */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                            {renderCardBadge('call_status', task.call_status)}
                            {renderCardBadge('portal_status', task.portal_status)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .kanban-board-grid {
          height: 100%;
        }
      `}</style>
    </div>
  );
}
