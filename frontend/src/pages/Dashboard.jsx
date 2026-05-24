// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  PhoneCall, 
  BrainCircuit, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  UserCheck
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { api } from '../api';

export default function Dashboard({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getDashboardMetrics(projectId);
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [projectId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
        <p className="animate-pulse">Analyzing tenant registration metadata...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', margin: '1rem 0' }}>
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button onClick={loadDashboardData} className="btn btn-danger btn-sm mt-4">Retry</button>
      </div>
    );
  }

  const { metrics, recent_activities, ai_insights } = data;

  // Prepare chart data
  const portalChartData = [
    { name: 'Registered', value: metrics.portal_registered },
    { name: 'Pending', value: metrics.portal_pending },
    { name: 'Not Registered', value: metrics.portal_not_registered }
  ].filter(item => item.value > 0);

  const COLORS = ['var(--success)', 'var(--warning)', 'var(--danger)'];

  const callChartData = Object.keys(metrics.call_status_breakdown).map(key => ({
    name: key,
    Count: metrics.call_status_breakdown[key]
  }));

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header with Quick Overview */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Overview Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Active registration status metrics and AI analytics.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-card)', padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <TrendingUp size={16} style={{ color: 'var(--success)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>
            Portal Registration: {metrics.registration_rate}%
          </span>
        </div>
      </div>

      {/* 2. Top Summary KPI Row */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        {/* Total Tenants */}
        <div className="glass-card p-6" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL TENANTS</span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0.125rem 0' }}>{metrics.total_tasks}</h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Created in project database</span>
          </div>
        </div>

        {/* Registered Tenants */}
        <div className="glass-card p-6" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>REGISTERED</span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0.125rem 0' }}>{metrics.portal_registered}</h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: '700' }}>{metrics.registration_rate}% registration rate</span>
          </div>
        </div>

        {/* Pending Tenants */}
        <div className="glass-card p-6" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--warning-light)', borderRadius: 'var(--radius-md)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>PENDING VALIDATION</span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0.125rem 0' }}>{metrics.portal_pending}</h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Awaiting code submission</span>
          </div>
        </div>

        {/* Call Completion Progress */}
        <div className="glass-card p-6" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--info-light)', borderRadius: 'var(--radius-md)', color: 'var(--info)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>CALLS COMPLETED</span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0.125rem 0' }}>{metrics.calls_completed}</h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--info)', fontWeight: '700' }}>{metrics.progress_percentage}% campaign progress</span>
          </div>
        </div>
      </div>

      {/* 3. Rule-Based AI Recommendations Panel (Premium Glowing Card) */}
      <div 
        style={{
          background: 'linear-gradient(135deg, hsla(250, 85%, 65%, 0.08) 0%, hsla(180, 80%, 45%, 0.03) 100%)',
          border: '1px solid hsla(250, 85%, 65%, 0.15)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-glow)',
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle decorative background gradient */}
        <div 
          style={{
            position: 'absolute',
            width: '120px',
            height: '120px',
            top: '-20%',
            right: '-10%',
            background: 'radial-gradient(circle, hsla(250, 85%, 65%, 0.2) 0%, transparent 70%)',
            zIndex: 1
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', position: 'relative', zIndex: 2 }}>
          <div 
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--border-focus) 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px 0 hsla(250, 85%, 65%, 0.4)'
            }}
          >
            <BrainCircuit size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.1em', color: 'var(--primary)', textTransform: 'uppercase', display: 'block' }}>COGNITIVE MODULE</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.01em', margin: 0 }}>AI Registration Analytics & Recommendations</h3>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }} className="ai-panels-grid">
          {/* Insights (What happened) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>DATA INSIGHTS</span>
            {ai_insights.analytics.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No critical patterns detected in the current workspace dataset.</p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {ai_insights.analytics.map((insight, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <Sparkles size={14} style={{ color: 'var(--primary)', marginTop: '3px', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{insight}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recommendations (What to do) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.875rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>SMART ACTION SUGGESTIONS</span>
            {ai_insights.recommendations.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Workspace operation is healthy. Continue default tracking workflows.</p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {ai_insights.recommendations.map((recommendation, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={14} style={{ color: 'var(--success)', marginTop: '3px', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{recommendation}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 4. Charts Row */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1.5rem'
        }}
        className="charts-grid"
      >
        {/* Pie Chart: Portal Status */}
        <div className="card p-6" style={{ display: 'flex', flexDirection: 'column', height: '350px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Portal Registration Status</h3>
          {portalChartData.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No tasks with portal status data.
            </div>
          ) : (
            <div style={{ flex: 1, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portalChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {portalChartData.map((entry, index) => {
                      const colorMap = {
                        'Registered': 'var(--success)',
                        'Pending': 'var(--warning)',
                        'Not Registered': 'var(--danger)'
                      };
                      return <Cell key={`cell-${index}`} fill={colorMap[entry.name] || 'var(--primary)'} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-card)', 
                      borderColor: 'var(--border)', 
                      borderRadius: 'var(--radius-md)', 
                      color: 'var(--text-primary)' 
                    }} 
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar Chart: Call Status */}
        <div className="card p-6" style={{ display: 'flex', flexDirection: 'column', height: '350px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Outreach Call Outcomes</h3>
          {metrics.total_tasks === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No tasks with call status data.
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-card)', 
                      borderColor: 'var(--border)', 
                      borderRadius: 'var(--radius-md)', 
                      color: 'var(--text-primary)' 
                    }} 
                  />
                  <Bar dataKey="Count" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 5. Bottom Grid: Call Counts Breakdown Table & Recent Activities */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1.5rem'
        }}
        className="details-grid"
      >
        {/* Call Status Breakdown Counts */}
        <div className="card p-6">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Call Outcomes Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.keys(metrics.call_status_breakdown).map((status) => {
              const count = metrics.call_status_breakdown[status];
              const percentage = metrics.total_tasks > 0 ? Math.round((count / metrics.total_tasks) * 100) : 0;
              
              const badgeClasses = {
                'Completed': 'badge-registered',
                'Follow-up Needed': 'badge-pending',
                'Call Not Picked Up': 'badge-call-not-picked',
                'Re-scheduled': 'badge-call-rescheduled',
                'Facing Issue in Registration': 'badge-call-issue',
                'Invalid Number': 'badge-call-invalid'
              };
              
              return (
                <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{count}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '35px', textAlign: 'right' }}>{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Logs */}
        <div className="card p-6" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} className="text-muted-color" />
            Recent Activity Feed
          </h3>
          {recent_activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No recent activity recorded.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recent_activities.map((log) => (
                <div key={log.id} style={{ display: 'flex', gap: '0.75rem', position: 'relative' }} className="timeline-item">
                  <div 
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Activity size={12} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>
                      {log.action} <span style={{ fontWeight: '500', color: 'var(--text-muted)' }}>by {log.full_name || 'System'}</span>
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.details}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (min-width: 1024px) {
          .details-grid {
            grid-template-columns: 2fr 3fr !important;
          }
          .ai-panels-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
