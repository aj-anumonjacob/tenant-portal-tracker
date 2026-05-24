// frontend/src/components/FieldBuilder.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  FileCode2, 
  Check, 
  AlertTriangle,
  MoveUp,
  MoveDown
} from 'lucide-react';
import { api } from '../api';

export default function FieldBuilder({ projectId, onFieldsUpdated }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Field Editor Form State
  const [editingField, setEditingField] = useState(null); // null means adding a new field
  const [fieldName, setFieldName] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldOptionsText, setFieldOptionsText] = useState(''); // Comma separated for editing convenience
  const [isRequired, setIsRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [status, setStatus] = useState('enabled');

  // Load fields
  const loadFields = async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getCustomFields(projectId);
      setFields(res.data);
      if (onFieldsUpdated) onFieldsUpdated();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
    resetForm();
  }, [projectId]);

  const resetForm = () => {
    setEditingField(null);
    setFieldName('');
    setFieldKey('');
    setFieldType('text');
    setFieldOptionsText('');
    setIsRequired(false);
    setDefaultValue('');
    setSortOrder(fields.length);
    setStatus('enabled');
    setError('');
  };

  const handleEditSelect = (field) => {
    setEditingField(field);
    setFieldName(field.field_name);
    setFieldKey(field.field_key);
    setFieldType(field.field_type);
    
    // Format options array back to comma-separated string
    const options = Array.isArray(field.field_options) ? field.field_options : [];
    setFieldOptionsText(options.join(', '));
    
    setIsRequired(field.is_required);
    setDefaultValue(field.default_value || '');
    setSortOrder(field.sort_order || 0);
    setStatus(field.status || 'enabled');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fieldName.trim() || !fieldType) {
      setError('Field Name and Field Type are required.');
      return;
    }

    setError('');
    setSuccess('');
    
    // Parse options if relevant
    let fieldOptions = null;
    if (['dropdown', 'checkbox', 'radio'].includes(fieldType)) {
      fieldOptions = fieldOptionsText
        .split(',')
        .map(opt => opt.trim())
        .filter(opt => opt !== '');
        
      if (fieldOptions.length === 0) {
        setError('At least one option is required for dropdowns, checkboxes, or radios.');
        return;
      }
    }

    const payload = {
      project_id: projectId,
      field_name: fieldName.trim(),
      field_key: fieldKey.trim() || undefined, // Optional on create
      field_type: fieldType,
      field_options: fieldOptions,
      is_required: isRequired ? 1 : 0,
      default_value: defaultValue.trim(),
      sort_order: parseInt(sortOrder, 10) || 0,
      status: status
    };

    try {
      if (editingField) {
        // Edit Field
        payload.id = editingField.id;
        await api.updateCustomField(payload);
        setSuccess('Custom field updated successfully.');
      } else {
        // Create Field
        await api.createCustomField(payload);
        setSuccess('Custom field created successfully.');
      }
      resetForm();
      await loadFields();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (fieldId, name) => {
    if (!window.confirm(`Are you sure you want to delete custom field "${name}"? This will delete all existing data stored under this field for all tasks. This cannot be undone.`)) {
      return;
    }
    
    setError('');
    setSuccess('');
    try {
      await api.deleteCustomField(fieldId);
      setSuccess('Custom field deleted successfully.');
      await loadFields();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleToggleStatus = async (field) => {
    const nextStatus = field.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      await api.updateCustomField({
        id: field.id,
        status: nextStatus
      });
      await loadFields();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleMoveOrder = async (field, direction) => {
    const currentIndex = fields.findIndex(f => f.id === field.id);
    let targetIndex = currentIndex + (direction === 'up' ? -1 : 1);
    
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    
    const targetField = fields[targetIndex];
    
    try {
      // Swap sort orders
      await api.updateCustomField({ id: field.id, sort_order: targetField.sort_order });
      await api.updateCustomField({ id: targetField.id, sort_order: field.sort_order });
      await loadFields();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="field-builder-layout">
      
      {/* 1. Left side/Top: Add or Edit Field Drawer Form */}
      <div className="card p-6" style={{ alignSelf: 'flex-start' }}>
        <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileCode2 size={20} className="text-muted-color" />
          {editingField ? 'Edit Custom Field' : 'Create Custom Field'}
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
            <label className="form-label">Field Name <span className="required">*</span></label>
            <input 
              type="text" 
              className="form-control" 
              value={fieldName} 
              onChange={(e) => setFieldName(e.target.value)} 
              placeholder="e.g. Unit Contract Value"
              required
            />
          </div>

          {!editingField && (
            <div className="form-group">
              <label className="form-label">
                Field Key (Unique Identifier, auto-generated if blank)
              </label>
              <input 
                type="text" 
                className="form-control" 
                value={fieldKey} 
                onChange={(e) => setFieldKey(e.target.value)} 
                placeholder="e.g. contract_value"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Alphanumeric characters and underscores only.
              </span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Field Type <span className="required">*</span></label>
            <select 
              className="form-control" 
              value={fieldType} 
              onChange={(e) => setFieldType(e.target.value)}
              disabled={editingField !== null} // Type cannot be modified after creation to prevent DB conflicts
            >
              <option value="text">Text Input</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="dropdown">Dropdown Select</option>
              <option value="checkbox">Checkboxes (Multiple)</option>
              <option value="radio">Radio Buttons (Single)</option>
              <option value="textarea">Textarea (Long Text)</option>
              <option value="email">Email Address</option>
              <option value="phone">Phone Number</option>
              <option value="file">File Upload</option>
            </select>
          </div>

          {['dropdown', 'checkbox', 'radio'].includes(fieldType) && (
            <div className="form-group animate-fade-in">
              <label className="form-label">Field Options <span className="required">*</span></label>
              <input 
                type="text" 
                className="form-control" 
                value={fieldOptionsText} 
                onChange={(e) => setFieldOptionsText(e.target.value)} 
                placeholder="Option 1, Option 2, Option 3"
                required
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Enter options separated by commas.
              </span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Default Value</label>
            <input 
              type="text" 
              className="form-control" 
              value={defaultValue} 
              onChange={(e) => setDefaultValue(e.target.value)} 
              placeholder="Optional default placeholder"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Sort Order</label>
              <input 
                type="number" 
                className="form-control" 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value)} 
              />
            </div>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Status</label>
              <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label" style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
              <input 
                type="checkbox" 
                checked={isRequired} 
                onChange={(e) => setIsRequired(e.target.checked)} 
              />
              <span>Is this field required?</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {editingField ? 'Save Changes' : 'Create Custom Field'}
            </button>
            {editingField && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 2. Right side/Bottom: List of Existing Fields */}
      <div className="card p-6">
        <h3 style={{ marginBottom: '1rem' }}>Configured Fields ({fields.length})</h3>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
            Loading custom field schemas...
          </div>
        ) : fields.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <AlertTriangle style={{ margin: '0 auto 0.5rem', display: 'block' }} size={28} />
            <p>No fields found for this project.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Create a field using the form to generate project task lists.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {fields.map((field, idx) => {
              const isDisabled = field.status === 'disabled';
              return (
                <div 
                  key={field.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.875rem 1rem',
                    backgroundColor: isDisabled ? 'var(--bg-app)' : 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    opacity: isDisabled ? 0.65 : 1,
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{field.field_name}</span>
                      <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.375rem', backgroundColor: 'var(--border)', borderRadius: '4px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                        {field.field_type.toUpperCase()}
                      </span>
                      {field.is_required && (
                        <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.375rem', backgroundColor: 'var(--danger-light)', borderRadius: '4px', color: 'var(--danger)', fontWeight: '700' }}>
                          REQUIRED
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      key: {field.field_key} | Order: {field.sort_order}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {/* Reordering */}
                    <button 
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => handleMoveOrder(field, 'up')}
                      disabled={idx === 0}
                      title="Move Up"
                      style={{ padding: '6px' }}
                    >
                      <MoveUp size={14} />
                    </button>
                    <button 
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => handleMoveOrder(field, 'down')}
                      disabled={idx === fields.length - 1}
                      title="Move Down"
                      style={{ padding: '6px' }}
                    >
                      <MoveDown size={14} />
                    </button>

                    {/* Enable/Disable Toggle */}
                    <button 
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => handleToggleStatus(field)}
                      title={isDisabled ? "Enable Field" : "Disable Field"}
                      style={{ padding: '6px' }}
                    >
                      {isDisabled ? <EyeOff size={14} style={{ color: 'var(--text-muted)' }} /> : <Eye size={14} style={{ color: 'var(--primary)' }} />}
                    </button>

                    {/* Edit */}
                    <button 
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => handleEditSelect(field)}
                      title="Edit Configuration"
                      style={{ padding: '6px' }}
                    >
                      <Edit3 size={14} />
                    </button>

                    {/* Delete */}
                    <button 
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => handleDelete(field.id, field.field_name)}
                      title="Delete Field"
                      style={{ padding: '6px' }}
                    >
                      <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .field-builder-layout {
            grid-template-columns: 2fr 3fr !important;
          }
        }
      `}</style>
    </div>
  );
}
