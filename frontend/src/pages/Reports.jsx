// frontend/src/pages/Reports.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Calendar,
  Filter,
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { api, API_BASE_URL } from '../api';

export default function Reports({ projectId }) {
  const [fields, setFields] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    registered: 0,
    not_registered: 0,
    pending: 0,
    completed_calls: 0,
    progress_percent: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterPortalStatus, setFilterPortalStatus] = useState('');
  const [filterCallStatus, setFilterCallStatus] = useState('');
  const [filterTaskStatus, setFilterTaskStatus] = useState('');

  const generateReport = async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    
    const filters = {
      start_date: startDate,
      end_date: endDate,
      portal_status: filterPortalStatus,
      call_status: filterCallStatus,
      task_status: filterTaskStatus
    };

    try {
      const res = await api.getReportData(projectId, filters);
      setFields(res.data.fields || []);
      setTasks(res.data.tasks || []);
      setSummary(res.data.summary || {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [projectId]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (tasks.length === 0) return;
    
    // Construct CSV content
    // Headers
    const headers = fields.map(f => `"${f.field_name}"`);
    headers.push('"Task Status"');
    headers.push('"Created Date"');
    
    const csvRows = [headers.join(',')];
    
    // Rows
    tasks.forEach(task => {
      const row = fields.map(f => {
        let val = task[f.field_key] || '';
        // Strip line breaks and double quotes for clean CSV columns
        if (typeof val === 'object') {
          val = JSON.stringify(val);
        }
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      });
      row.push(`"${task.task_status}"`);
      row.push(`"${task.created_at}"`);
      csvRows.push(row.join(','));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tenant_Registration_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Print Handler
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header with Export buttons */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
        className="no-print"
      >
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Management Reports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Export data logs or generate executive PDFs.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handleExportCSV} 
            className="btn btn-secondary"
            disabled={tasks.length === 0}
          >
            <Download size={16} />
            <span>Download CSV</span>
          </button>
          <button 
            onClick={handlePrintPDF} 
            className="btn btn-primary"
            disabled={tasks.length === 0}
          >
            <Printer size={16} />
            <span>Print Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Grid Panel */}
      <div className="card p-5 no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} className="text-muted-color" />
          Filter Generation Parameters
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {/* Start Date */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Start Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>

          {/* End Date */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>End Date</label>
            <input 
              type="date" 
              className="form-control" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>

          {/* Call Status Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Call Status</label>
            <select
              className="form-control"
              value={filterCallStatus}
              onChange={(e) => setFilterCallStatus(e.target.value)}
            >
              <option value="">All Call Statuses</option>
              <option value="Follow-up Needed">Follow-up Needed</option>
              <option value="Call Not Picked Up">Call Not Picked Up</option>
              <option value="Re-scheduled">Re-scheduled</option>
              <option value="Facing Issue in Registration">Facing Issue</option>
              <option value="Invalid Number">Invalid Number</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Portal Status Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Portal Status</label>
            <select
              className="form-control"
              value={filterPortalStatus}
              onChange={(e) => setFilterPortalStatus(e.target.value)}
            >
              <option value="">All Portal Statuses</option>
              <option value="Registered">Registered</option>
              <option value="Not Registered">Not Registered</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {/* Task Status Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Task Status</label>
            <select
              className="form-control"
              value={filterTaskStatus}
              onChange={(e) => setFilterTaskStatus(e.target.value)}
            >
              <option value="">All Task Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <button 
          onClick={generateReport} 
          className="btn btn-primary"
          style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }}
          disabled={loading}
        >
          {loading ? 'Compiling Report...' : 'Apply Filters & Compile'}
        </button>
      </div>

      {/* PRINT-ONLY EXECUTIVE HEADER */}
      <div 
        style={{ display: 'none', flexDirection: 'column', gap: '0.5rem', borderBottom: '2px solid #000000', paddingBottom: '1rem', marginBottom: '1.5rem' }}
        className="print-header-only"
      >
        <h1 style={{ fontSize: '24pt', fontWeight: '800' }}>Executive Work Report</h1>
        <span style={{ fontSize: '10pt', color: '#666666' }}>
          Project: Tenant Portal Registration | Generated: {new Date().toLocaleDateString()}
        </span>
        {startDate && endDate && (
          <span style={{ fontSize: '10pt', color: '#444444' }}>
            Reporting Interval: {startDate} to {endDate}
          </span>
        )}
      </div>

      {/* 3. Summary Cards row */}
      {summary.total > 0 && (
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.25rem',
            pageBreakInside: 'avoid'
          }}
        >
          <div className="card p-5" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Filtered Rows</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem' }}>{summary.total}</h3>
          </div>
          <div className="card p-5" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Registered</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--success)' }}>{summary.registered}</h3>
          </div>
          <div className="card p-5" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Pending</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--warning)' }}>{summary.pending}</h3>
          </div>
          <div className="card p-5" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Not Registered</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--danger)' }}>{summary.not_registered}</h3>
          </div>
          <div className="card p-5" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Completed Calls</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--info)' }}>{summary.completed_calls}</h3>
          </div>
        </div>
      )}

      {/* 4. Detailed Results Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Retrieving filtered report results...
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
            <AlertTriangle style={{ margin: '0 auto 0.5rem', display: 'block' }} size={24} />
            <p>No task entries match the filtered parameters.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Select alternative options above and recompile the report.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border)' }}>
                  
                  {/* Dynamic headers mapping fields definitions */}
                  {fields.map(field => (
                    <th 
                      key={field.id}
                      style={{
                        padding: '1rem 1.25rem',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {field.field_name}
                    </th>
                  ))}

                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Task Status
                  </th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Created Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    
                    {/* Render dynamic columns cell values */}
                    {fields.map(field => {
                      const val = task[field.field_key];
                      
                      // Highlight value styling for printed reports
                      const isStatus = ['portal_status', 'call_status'].includes(field.field_key);
                      return (
                        <td 
                          key={field.id} 
                          style={{ 
                            padding: '1rem 1.25rem', 
                            fontSize: '0.85rem', 
                            fontWeight: '500' 
                          }}
                        >
                          {isStatus ? (
                            <span style={{ fontWeight: '700' }}>{val || '—'}</span>
                          ) : (
                            val || '—'
                          )}
                        </td>
                      );
                    })}

                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: '700' }}>
                      {task.task_status}
                    </td>
                    
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(task.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .print-header-only {
            display: flex !important;
          }
          
          /* Table cell border highlights */
          th, td {
            border: 1px solid #dddddd !important;
          }
        }
      `}</style>
    </div>
  );
}
