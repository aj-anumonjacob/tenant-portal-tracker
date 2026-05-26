// frontend/src/pages/TaskList.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { api, API_BASE_URL } from '../api';
import DynamicForm from '../components/DynamicForm';

export default function TaskList({ projectId }) {
  const [fields, setFields] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Import/Export Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

  // Filters and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPortalStatus, setFilterPortalStatus] = useState('');
  const [filterCallStatus, setFilterCallStatus] = useState('');
  const [filterTaskStatus, setFilterTaskStatus] = useState('');
  
  // Sort State
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadTasksData = async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getTasks(projectId);
      setFields(res.data.fields || []);
      setTasks(res.data.tasks || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportTemplate = async () => {
    try {
      await api.exportTasks(projectId, 'template');
    } catch (e) {
      alert(`Export template failed: ${e.message}`);
    }
  };

  const handleExportData = async () => {
    try {
      await api.exportTasks(projectId, 'export');
    } catch (e) {
      alert(`Export data failed: ${e.message}`);
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const res = await api.importTasks(projectId, selectedFile);
      setImportResult(res.data);
      setSelectedFile(null);
      await loadTasksData();
    } catch (e) {
      setImportError(e.message);
    } finally {
      setImporting(false);
    }
  };
  
  useEffect(() => {
    loadTasksData();
    // Reset filters on project switch
    setSearchQuery('');
    setFilterPortalStatus('');
    setFilterCallStatus('');
    setFilterTaskStatus('');
    setCurrentPage(1);
  }, [projectId]);

  // Apply filters, search, and sorting
  useEffect(() => {
    let result = [...tasks];

    // 1. Search Query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => {
        // Search across unit_number, tenant_name, and phone_number fields if they exist
        const name = task.tenant_name ? String(task.tenant_name).toLowerCase() : '';
        const unit = task.unit_number ? String(task.unit_number).toLowerCase() : '';
        const phone = task.phone_number ? String(task.phone_number).toLowerCase() : '';
        return name.includes(query) || unit.includes(query) || phone.includes(query);
      });
    }

    // 2. Portal Status Filter
    if (filterPortalStatus) {
      result = result.filter(t => t.portal_status === filterPortalStatus);
    }

    // 3. Call Status Filter
    if (filterCallStatus) {
      result = result.filter(t => t.call_status === filterCallStatus);
    }

    // 4. Task Status Filter
    if (filterTaskStatus) {
      result = result.filter(t => t.task_status === filterTaskStatus);
    }

    // 5. Sorting
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Convert unit numbers to numbers for proper numeric sorting
      if (sortField === 'unit_number') {
        const numA = parseInt(valA, 10);
        const numB = parseInt(valB, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          valA = numA;
          valB = numB;
        }
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredTasks(result);
    setCurrentPage(1); // reset to page 1 on filter
  }, [tasks, searchQuery, filterPortalStatus, filterCallStatus, filterTaskStatus, sortField, sortDirection]);

  // Handle Create / Update submissions
  const handleFormSubmit = async (payload) => {
    try {
      if (editingTask) {
        // Edit Task
        // If payload is FormData, add _method=PUT elsewhere
        await api.updateTask(editingTask.id, payload);
      } else {
        // Create Task
        // Append current project ID to payload
        if (payload instanceof FormData) {
          payload.append('project_id', projectId);
        } else {
          payload.project_id = projectId;
        }
        await api.createTask(payload);
      }
      
      setIsDrawerOpen(false);
      setEditingTask(null);
      await loadTasksData();
    } catch (e) {
      alert(`Operation failed: ${e.message}`);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task entry? All associated data will be deleted permanently.')) {
      return;
    }
    try {
      await api.deleteTask(taskId);
      await loadTasksData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleEditSelect = (task) => {
    setEditingTask(task);
    setIsDrawerOpen(true);
  };

  const handleSort = (fieldKey) => {
    if (sortField === fieldKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(fieldKey);
      setSortDirection('asc');
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTasks.slice(indexOfFirstItem, indexOfLastItem);

  // Status Badge Mapper
  const renderBadge = (fieldKey, value) => {
    if (!value) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    
    if (fieldKey === 'portal_status') {
      const cls = value === 'Registered' ? 'badge-registered' : (value === 'Pending' ? 'badge-pending' : 'badge-not-registered');
      return <span className={`badge ${cls}`}>{value}</span>;
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
      return <span className={`badge ${clsMap[value] || ''}`}>{value}</span>;
    }

    if (fieldKey === 'task_status') {
      const cls = value === 'Completed' ? 'badge-completed' : (value === 'In Progress' ? 'badge-inprogress' : 'badge-todo');
      return <span className={`badge ${cls}`}>{value}</span>;
    }
    
    return <span>{String(value)}</span>;
  };

  // Helper for file download formatting
  const renderCellValue = (field, task) => {
    const key = field.field_key;
    const value = task[key];
    
    if (field.field_type === 'file' && value && value.startsWith('backend/uploads/')) {
      const apiParentUrl = API_BASE_URL.replace('/api', '');
      const downloadUrl = `${apiParentUrl}/${value}`;
      return (
        <a 
          href={downloadUrl} 
          target="_blank" 
          rel="noreferrer" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600' }}
        >
          View file <ExternalLink size={12} />
        </a>
      );
    }
    
    if (['dropdown', 'radio', 'checkbox'].includes(field.field_type)) {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      if (typeof value === 'string' && value.startsWith('[')) {
        try {
          return JSON.parse(value).join(', ');
        } catch (e) {
          return value;
        }
      }
      return renderBadge(key, value);
    }
    
    return value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : <span style={{ color: 'var(--text-muted)' }}>—</span>;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Tasks Database</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Search, filter, and modify registration records.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="btn btn-secondary"
            title="Bulk import or export task entries via CSV/Excel"
          >
            <FileSpreadsheet size={18} />
            <span>Bulk Actions</span>
          </button>
          <button 
            onClick={() => {
              setEditingTask(null);
              setIsDrawerOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={18} />
            <span>New Task Entry</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Card */}
      <div className="card p-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' }}>
          
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={18} className="text-muted-color" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search Unit, Name, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Call Status Filter */}
          <select
            className="form-control"
            value={filterCallStatus}
            onChange={(e) => setFilterCallStatus(e.target.value)}
          >
            <option value="">Filter Call Status</option>
            <option value="Follow-up Needed">Follow-up Needed</option>
            <option value="Call Not Picked Up">Call Not Picked Up</option>
            <option value="Re-scheduled">Re-scheduled</option>
            <option value="Facing Issue in Registration">Facing Issue</option>
            <option value="Invalid Number">Invalid Number</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Portal Status Filter */}
          <select
            className="form-control"
            value={filterPortalStatus}
            onChange={(e) => setFilterPortalStatus(e.target.value)}
          >
            <option value="">Filter Portal Status</option>
            <option value="Registered">Registered</option>
            <option value="Not Registered">Not Registered</option>
            <option value="Pending">Pending</option>
          </select>

          {/* Task Status Filter */}
          <select
            className="form-control"
            value={filterTaskStatus}
            onChange={(e) => setFilterTaskStatus(e.target.value)}
          >
            <option value="">Filter Task Status</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

        </div>
      </div>

      {/* 3. Detailed Dynamic Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Retrieving tasks and fields configurations...
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <FileSpreadsheet style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.5 }} size={48} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>No task logs found</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>Get started by creating your first tracking entry.</p>
            <button 
              onClick={() => {
                setEditingTask(null);
                setIsDrawerOpen(true);
              }}
              className="btn btn-primary btn-sm"
            >
              Add Tenant Entry
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            No tasks match the active filter parameters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border)' }}>
                  
                  {/* Dynamic headers based on custom fields definitions */}
                  {fields.map(field => (
                    <th 
                      key={field.id}
                      onClick={() => handleSort(field.field_key)}
                      style={{
                        padding: '1rem 1.25rem',
                        fontWeight: '700',
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span>{field.field_name}</span>
                        {sortField === field.field_key && (
                          <span style={{ fontSize: '0.7rem' }}>
                            {sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}

                  {/* Core Task Status Header */}
                  <th 
                    onClick={() => handleSort('task_status')}
                    style={{
                      padding: '1rem 1.25rem',
                      fontWeight: '700',
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span>Task Status</span>
                      {sortField === 'task_status' && (
                        <span style={{ fontSize: '0.7rem' }}>
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                  
                  {/* Actions Header */}
                  <th style={{ padding: '1rem 1.25rem', width: '100px', textAlign: 'center', fontWeight: '700', fontSize: '0.8125rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((task) => (
                  <tr 
                    key={task.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Render cell values dynamically based on custom fields definitions */}
                    {fields.map(field => (
                      <td key={field.id} style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                        {renderCellValue(field, task)}
                      </td>
                    ))}

                    {/* Core Task Status Column */}
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem' }}>
                      {renderBadge('task_status', task.task_status)}
                    </td>

                    {/* Actions buttons */}
                    <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.375rem' }}>
                        <button 
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => handleEditSelect(task)}
                          title="Edit Task Record"
                          style={{ padding: '6px' }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => handleDelete(task.id)}
                          title="Delete Entry"
                          style={{ padding: '6px' }}
                        >
                          <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Table Pagination controls */}
      {!loading && filteredTasks.length > itemsPerPage && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTasks.length)} of {filteredTasks.length} entries
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary btn-sm btn-icon"
              style={{ padding: '6px' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary btn-sm btn-icon"
              style={{ padding: '6px' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 5. Modal Slide-out Form Drawer */}
      {isDrawerOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
          onClick={() => {
            setIsDrawerOpen(false);
            setEditingTask(null);
          }}
        >
          {/* Drawer Container */}
          <div 
            style={{
              width: '100%',
              maxWidth: '550px',
              height: '100%',
              backgroundColor: 'var(--bg-sidebar)',
              borderLeft: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
              animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              backdropFilter: 'blur(20px)',
              background: 'linear-gradient(180deg, var(--bg-sidebar) 0%, var(--bg-app) 100%)'
            }}
            onClick={(e) => e.stopPropagation()} // Stop bubble up
          >
            {/* Header */}
            <div 
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(90deg, var(--primary-light) 0%, transparent 100%)'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                  {editingTask ? 'Edit Task Record' : 'Create Task Entry'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                  {editingTask ? `Updating task registry ID #${editingTask.id}` : 'Fill in the custom fields configured for this project'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsDrawerOpen(false);
                  setEditingTask(null);
                }}
                className="btn btn-secondary btn-icon btn-sm"
                style={{ 
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-card)'
                }}
                title="Close Form"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form body */}
            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Task Status</label>
                <select 
                  className="form-control"
                  value={editingTask ? editingTask.task_status : (editingTask ? editingTask.task_status : 'To Do')}
                  onChange={(e) => {
                    // Update task status inside editingTask or local formData placeholder
                    if (editingTask) {
                      setEditingTask(prev => ({ ...prev, task_status: e.target.value }));
                    }
                  }}
                  id="drawer_task_status"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Dynamic form mapping fields definitions */}
              <DynamicForm 
                fields={fields}
                initialValues={editingTask || {}}
                submitLabel={editingTask ? 'Save Changes' : 'Create Entry'}
                onSubmit={(payload) => {
                  // Capture status input from custom selector
                  const statusInput = document.getElementById('drawer_task_status');
                  const statusVal = statusInput ? statusInput.value : 'To Do';
                  
                  if (payload instanceof FormData) {
                    payload.append('task_status', statusVal);
                  } else {
                    payload.task_status = statusVal;
                  }
                  
                  handleFormSubmit(payload);
                }}
                onCancel={() => {
                  setIsDrawerOpen(false);
                  setEditingTask(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. Bulk Import/Export Modal */}
      {isImportModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(6px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => {
            if (!importing) {
              setIsImportModalOpen(false);
              setSelectedFile(null);
              setImportResult(null);
              setImportError('');
            }
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '550px',
              backgroundColor: 'var(--bg-sidebar)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
              animation: 'fadeIn var(--transition-normal) forwards',
              background: 'linear-gradient(180deg, var(--bg-sidebar) 0%, var(--bg-app) 100%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(90deg, var(--primary-light) 0%, transparent 100%)'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                  Bulk Import / Export
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                  Download CSV templates, export database rows, or import Excel-edited data
                </p>
              </div>
              <button 
                onClick={() => {
                  if (!importing) {
                    setIsImportModalOpen(false);
                    setSelectedFile(null);
                    setImportResult(null);
                    setImportError('');
                  }
                }}
                disabled={importing}
                className="btn btn-secondary btn-icon btn-sm"
                style={{ 
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-card)'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Export Section */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  1. Export Actions
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button 
                    onClick={handleExportTemplate}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center', padding: '0.75rem' }}
                  >
                    <FileSpreadsheet size={16} />
                    <span>Get Template</span>
                  </button>
                  <button 
                    onClick={handleExportData}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center', padding: '0.75rem' }}
                  >
                    <ExternalLink size={16} />
                    <span>Export Tasks</span>
                  </button>
                </div>
              </div>

              <div style={{ borderBottom: '1px solid var(--border)' }}></div>

              {/* Import Section */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  2. Import CSV File
                </h4>
                
                {!importResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div 
                      style={{
                        border: '2px dashed var(--border)',
                        borderRadius: '10px',
                        padding: '2rem 1.5rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        transition: 'border-color var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                      onClick={() => document.getElementById('csv-file-input').click()}
                    >
                      <input 
                        type="file" 
                        id="csv-file-input" 
                        accept=".csv" 
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                      />
                      <FileSpreadsheet size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', opacity: 0.7 }} />
                      <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                        {selectedFile ? selectedFile.name : 'Click to select CSV File'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Only .csv files (Excel exports) are supported
                      </p>
                    </div>

                    {importError && (
                      <div className="alert alert-danger" style={{ fontSize: '0.85rem', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                        <strong>Error:</strong> {importError}
                      </div>
                    )}

                    {selectedFile && (
                      <button 
                        onClick={handleImportSubmit}
                        disabled={importing}
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                      >
                        {importing ? 'Importing Data...' : 'Upload & Import back'}
                      </button>
                    )}
                  </div>
                )}

                {/* Import Result Screen */}
                {importResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div 
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        padding: '1rem',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <h5 style={{ color: '#10b981', fontWeight: '700', fontSize: '0.95rem' }}>Import Summary</h5>
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                        <div><strong>New Tasks Added:</strong> {importResult.created_count}</div>
                        <div><strong>Tasks Updated:</strong> {importResult.updated_count}</div>
                      </div>
                    </div>

                    {importResult.errors && importResult.errors.length > 0 && (
                      <div>
                        <h5 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--danger)', marginBottom: '0.5rem' }}>
                          Validation Errors / Warnings ({importResult.errors.length})
                        </h5>
                        <div 
                          style={{
                            maxHeight: '150px',
                            overflowY: 'auto',
                            backgroundColor: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.1)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.375rem',
                            fontFamily: 'monospace'
                          }}
                        >
                          {importResult.errors.map((err, idx) => (
                            <div key={idx} style={{ color: 'var(--danger)' }}>• {err}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setSelectedFile(null);
                        setImportResult(null);
                        setImportError('');
                      }}
                      className="btn btn-secondary"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Close & Finish
                    </button>
                  </div>
                )}

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
