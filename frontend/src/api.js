// frontend/src/api.js

// Detect API base URL. During development, it defaults to a local path.
// The user can configure VITE_API_URL in a .env file.
const DEFAULT_DEV_URL = 'http://localhost:8000/api'; // Or wherever their local PHP server runs
export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_DEV_URL;

/**
 * Standard HTTP Request Wrapper
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('tenant_tracker_token');
  
  // Set headers
  const headers = { ...options.headers };
  
  // Only set application/json if not sending FormData (e.g. file upload)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers
  };
  
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    // If unauthorized, redirect to login
    if (response.status === 401) {
      localStorage.removeItem('tenant_tracker_token');
      localStorage.removeItem('tenant_tracker_user');
      // Dispatch custom event to let App.jsx know it needs to redirect to login
      window.dispatchEvent(new Event('auth-failed'));
    }
    throw new Error(data.message || 'Something went wrong.');
  }
  
  return data;
}

export const api = {
  // 1. Auth
  login: (username, password) => 
    request('auth.php', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
    
  // 2. Projects
  getProjects: () => 
    request('projects.php', { method: 'GET' }),
    
  createProject: (name, description) => 
    request('projects.php', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    }),
    
  // 3. Custom Fields
  getCustomFields: (projectId) => 
    request(`custom_fields.php?project_id=${projectId}`, { method: 'GET' }),
    
  createCustomField: (fieldData) => 
    request('custom_fields.php', {
      method: 'POST',
      body: JSON.stringify(fieldData)
    }),
    
  updateCustomField: (fieldData) => 
    request('custom_fields.php', {
      method: 'PUT',
      body: JSON.stringify(fieldData)
    }),
    
  deleteCustomField: (fieldId) => 
    request(`custom_fields.php?id=${fieldId}`, {
      method: 'DELETE'
    }),
    
  // 4. Tasks (Supports JSON and FormData for uploads)
  getTasks: (projectId) => 
    request(`tasks.php?project_id=${projectId}`, { method: 'GET' }),
    
  createTask: (taskData) => {
    const isFormData = taskData instanceof FormData;
    return request('tasks.php', {
      method: 'POST',
      body: isFormData ? taskData : JSON.stringify(taskData)
    });
  },
  
  updateTask: (taskId, taskData) => {
    // If it is FormData, append _method=PUT to bypass PHP's inability to parse multipart PUT
    if (taskData instanceof FormData) {
      taskData.append('_method', 'PUT');
      taskData.append('id', taskId);
      return request(`tasks.php?id=${taskId}`, {
        method: 'POST',
        body: taskData
      });
    } else {
      // Normal JSON
      return request('tasks.php', {
        method: 'POST', // Send as POST with _method=PUT key
        body: JSON.stringify({ ...taskData, _method: 'PUT', id: taskId })
      });
    }
  },
  
  deleteTask: (taskId) => 
    request(`tasks.php?id=${taskId}`, {
      method: 'DELETE'
    }),
    
  // 5. Dashboard
  getDashboardMetrics: (projectId) => 
    request(`dashboard.php?project_id=${projectId}`, { method: 'GET' }),
    
  // 6. Kanban
  getKanbanData: (projectId) => 
    request(`kanban.php?project_id=${projectId}`, { method: 'GET' }),
    
  updateTaskColumn: (taskId, columnStatus) => 
    request('kanban.php', {
      method: 'PUT',
      body: JSON.stringify({ id: taskId, task_status: columnStatus })
    }),
    
  // 7. Reports
  getReportData: (projectId, filters = {}) => {
    const params = new URLSearchParams({ project_id: projectId });
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });
    return request(`reports.php?${params.toString()}`, { method: 'GET' });
  },
  
  // 8. Import / Export
  exportTasks: async (projectId, action = 'template') => {
    const token = localStorage.getItem('tenant_tracker_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/import_export.php?project_id=${projectId}&action=${action}`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to download CSV file.');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = action === 'export' ? `tasks_export_project_${projectId}.csv` : `tasks_template_project_${projectId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  
  importTasks: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`import_export.php?project_id=${projectId}`, {
      method: 'POST',
      body: formData
    });
  }
};
