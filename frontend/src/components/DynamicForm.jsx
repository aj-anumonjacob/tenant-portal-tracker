// frontend/src/components/DynamicForm.jsx
import React, { useState, useEffect } from 'react';
import { Upload, FileText, Check } from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function DynamicForm({ fields, onSubmit, initialValues = {}, submitLabel = 'Submit', onCancel }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  // Initialize values when fields or initialValues change
  useEffect(() => {
    const defaultData = {};
    fields.forEach(field => {
      const key = field.field_key;
      if (initialValues[key] !== undefined && initialValues[key] !== null) {
        // Parse checkboxes back to array if stored as JSON
        if (field.field_type === 'checkbox') {
          try {
            defaultData[key] = typeof initialValues[key] === 'string' 
              ? JSON.parse(initialValues[key]) 
              : (Array.isArray(initialValues[key]) ? initialValues[key] : []);
          } catch (e) {
            defaultData[key] = [];
          }
        } else {
          defaultData[key] = initialValues[key];
        }
      } else {
        // Use default value
        if (field.field_type === 'checkbox') {
          defaultData[key] = [];
        } else {
          defaultData[key] = field.default_value || '';
        }
      }
    });
    setFormData(defaultData);
    setErrors({});
  }, [fields, initialValues]);

  const handleChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
    // Clear field error
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleCheckboxChange = (key, option, checked) => {
    const currentList = Array.isArray(formData[key]) ? [...formData[key]] : [];
    if (checked) {
      if (!currentList.includes(option)) {
        currentList.push(option);
      }
    } else {
      const index = currentList.indexOf(option);
      if (index > -1) {
        currentList.splice(index, 1);
      }
    }
    handleChange(key, currentList);
  };

  const handleFileChange = (key, file) => {
    handleChange(key, file);
  };

  const validate = () => {
    const newErrors = {};
    fields.forEach(field => {
      const key = field.field_key;
      const value = formData[key];
      
      // Required check
      if (field.is_required) {
        if (field.field_type === 'checkbox') {
          if (!value || value.length === 0) {
            newErrors[key] = `${field.field_name} is required. Select at least one option.`;
          }
        } else if (field.field_type === 'file') {
          // In edit mode, we can already have an existing file URL
          const hasExistingFile = initialValues[key] && typeof initialValues[key] === 'string' && initialValues[key].startsWith('backend/uploads/');
          if (!value && !hasExistingFile) {
            newErrors[key] = `${field.field_name} is required. Please upload a file.`;
          }
        } else {
          if (value === undefined || value === null || String(value).trim() === '') {
            newErrors[key] = `${field.field_name} is required.`;
          }
        }
      }
      
      // Type validations (if not empty)
      if (value && String(value).trim() !== '') {
        if (field.field_type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors[key] = 'Please enter a valid email address.';
          }
        } else if (field.field_type === 'phone') {
          const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
          if (!phoneRegex.test(value)) {
            newErrors[key] = 'Please enter a valid phone number (7-15 digits).';
          }
        } else if (field.field_type === 'number') {
          if (isNaN(Number(value))) {
            newErrors[key] = 'Please enter a valid number.';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Package payload
      // If there are files, we should use FormData
      const containsFiles = fields.some(f => f.field_type === 'file' && formData[f.field_key] instanceof File);
      
      if (containsFiles) {
        const payload = new FormData();
        const customFieldsObj = {};
        
        fields.forEach(field => {
          const key = field.field_key;
          const val = formData[key];
          
          if (field.field_type === 'file') {
            if (val instanceof File) {
              payload.append(key, val); // Upload file under field key name
            }
          } else {
            customFieldsObj[key] = val;
          }
        });
        
        payload.append('custom_fields', JSON.stringify(customFieldsObj));
        onSubmit(payload);
      } else {
        // Plain JSON
        onSubmit({ custom_fields: formData });
      }
    }
  };

  // Get absolute URL for file links
  const getFileUrl = (relativeUrl) => {
    // Relative URL format from API is: backend/uploads/filename.ext
    // Need to strip 'backend/' from url during local development if base URL is direct to API path.
    // Let's replace 'backend/' with the base API parent path.
    const apiParentUrl = API_BASE_URL.replace('/api', '');
    return `${apiParentUrl}/${relativeUrl}`;
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {fields.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>No custom fields configured for this project.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Go to Field Builder in Settings to add some fields.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {fields.map(field => {
            const key = field.field_key;
            const label = field.field_name;
            const isRequired = field.is_required;
            const fieldOptions = Array.isArray(field.field_options) ? field.field_options : [];
            const error = errors[key];
            const val = formData[key];
            
            // Textareas, files, checkboxes, and radio button groups take full width
            const isFullWidth = ['textarea', 'file', 'checkbox', 'radio'].includes(field.field_type);
            
            return (
              <div 
                key={field.id} 
                className="form-group" 
                style={{ 
                  margin: 0,
                  gridColumn: isFullWidth ? '1 / -1' : 'span 1'
                }}
              >
              <label className="form-label">
                {label}
                {isRequired && <span className="required">*</span>}
              </label>

              {/* Rendering inputs depending on types */}
              {field.field_type === 'text' && (
                <input
                  type="text"
                  className="form-control"
                  value={val || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={`Enter ${label}`}
                  style={error ? { borderColor: 'var(--danger)' } : {}}
                />
              )}

              {field.field_type === 'number' && (
                <input
                  type="text"
                  className="form-control"
                  value={val || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={`Enter ${label} (digits)`}
                  style={error ? { borderColor: 'var(--danger)' } : {}}
                />
              )}

              {field.field_type === 'email' && (
                <input
                  type="email"
                  className="form-control"
                  value={val || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder="name@example.com"
                  style={error ? { borderColor: 'var(--danger)' } : {}}
                />
              )}

              {field.field_type === 'phone' && (
                <input
                  type="tel"
                  className="form-control"
                  value={val || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder="+971 50 000 0000"
                  style={error ? { borderColor: 'var(--danger)' } : {}}
                />
              )}

              {field.field_type === 'date' && (
                <input
                  type="date"
                  className="form-control"
                  value={val || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  style={error ? { borderColor: 'var(--danger)' } : {}}
                />
              )}

              {field.field_type === 'textarea' && (
                <textarea
                  className="form-control"
                  value={val || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  rows="3"
                  placeholder={`Enter details for ${label}`}
                  style={error ? { borderColor: 'var(--danger)' } : {}}
                />
              )}

              {field.field_type === 'dropdown' && (
                <select
                  className="form-control"
                  value={val || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  style={error ? { borderColor: 'var(--danger)' } : {}}
                >
                  <option value="">Select option</option>
                  {fieldOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {field.field_type === 'radio' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.375rem' }}>
                  {fieldOptions.map((opt, i) => (
                    <label key={i} className="radio-label">
                      <input
                        type="radio"
                        name={`radio_${key}`}
                        value={opt}
                        checked={val === opt}
                        onChange={() => handleChange(key, opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.field_type === 'checkbox' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.375rem' }}>
                  {fieldOptions.map((opt, i) => {
                    const isChecked = Array.isArray(val) && val.includes(opt);
                    return (
                      <label key={i} className="checkbox-label">
                        <input
                          type="checkbox"
                          value={opt}
                          checked={isChecked}
                          onChange={(e) => handleCheckboxChange(key, opt, e.target.checked)}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {field.field_type === 'file' && (
                <div style={{ marginTop: '0.375rem' }}>
                  {/* File Upload Box */}
                  <div 
                    style={{
                      border: '2px dashed var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--bg-app)',
                      cursor: 'pointer',
                      position: 'relative',
                      textAlign: 'center',
                      transition: 'border-color var(--transition-fast)'
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileChange(key, e.dataTransfer.files[0]);
                      }
                    }}
                  >
                    <input
                      type="file"
                      id={`file_${key}`}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%'
                      }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChange(key, e.target.files[0]);
                        }
                      }}
                    />
                    <Upload size={24} className="text-muted-color" style={{ marginBottom: '0.5rem' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                      {val instanceof File ? val.name : 'Drag & drop file here or click to browse'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Supports images, PDFs, spreadsheets (Max 10MB)
                    </span>
                  </div>

                  {/* Existing File Link */}
                  {initialValues[key] && typeof initialValues[key] === 'string' && initialValues[key].startsWith('backend/uploads/') && (
                    <div 
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'var(--success-light)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid hsla(142, 72%, 40%, 0.15)'
                      }}
                    >
                      <div style={{ display: 'flex', alignContent: 'center', gap: '0.5rem' }}>
                        <FileText size={16} style={{ color: 'var(--success)' }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: '600' }}>
                          Uploaded document attached
                        </span>
                      </div>
                      <a 
                        href={getFileUrl(initialValues[key])} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ fontSize: '0.8rem', fontWeight: '700', textDecoration: 'underline', color: 'var(--success)' }}
                      >
                        View File
                      </a>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.25rem' }}>
                  {error}
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}

      {/* Form Buttons */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          marginTop: '1.5rem',
          borderTop: '1px solid var(--border)',
          paddingTop: '1.25rem'
        }}
      >
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={fields.length === 0}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
