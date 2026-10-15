'use client';

import React, { useState } from 'react';
import { MediaSelectModal, SelectedMediaItem } from '@/components/media/MediaSelectModal';

export interface FieldDefinition {
  key: string;
  label: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

interface DynamicFieldsRendererProps {
  fields: FieldDefinition[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
}

export function DynamicFieldsRenderer({
  fields,
  values,
  onChange,
  disabled = false,
}: DynamicFieldsRendererProps) {
  const [activeImageFieldKey, setActiveImageFieldKey] = useState<string | null>(null);

  if (!fields || fields.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', padding: '8px 0' }}>
        Loại sản phẩm này chưa có trường tùy chỉnh nào.
      </div>
    );
  }

  const handleMultiSelectToggle = (fieldKey: string, option: string) => {
    const current = (values[fieldKey] || []) as string[];
    if (current.includes(option)) {
      onChange(fieldKey, current.filter((o) => o !== option));
    } else {
      onChange(fieldKey, [...current, option]);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
      {fields.map((field) => {
        const val = values[field.key] !== undefined ? values[field.key] : (field.defaultValue ?? '');

        return (
          <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
            <label className={`form-label ${field.required ? 'required' : ''}`} htmlFor={`df-${field.key}`}>
              {field.label}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 'normal' }}>
                ({field.key})
              </span>
            </label>

            {/* Type: Text */}
            {field.type === 'text' && (
              <input
                id={`df-${field.key}`}
                type="text"
                className="form-input"
                value={val}
                onChange={(e) => onChange(field.key, e.target.value)}
                disabled={disabled}
                required={field.required}
              />
            )}

            {/* Type: Textarea */}
            {field.type === 'textarea' && (
              <textarea
                id={`df-${field.key}`}
                className="form-textarea"
                rows={3}
                value={val}
                onChange={(e) => onChange(field.key, e.target.value)}
                disabled={disabled}
                required={field.required}
              />
            )}

            {/* Type: Number */}
            {field.type === 'number' && (
              <input
                id={`df-${field.key}`}
                type="number"
                className="form-input"
                min={field.validation?.min}
                max={field.validation?.max}
                value={val}
                onChange={(e) => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
                disabled={disabled}
                required={field.required}
              />
            )}

            {/* Type: Boolean */}
            {field.type === 'boolean' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '40px' }}>
                <input
                  type="checkbox"
                  checked={Boolean(val)}
                  onChange={(e) => onChange(field.key, e.target.checked)}
                  disabled={disabled}
                />
                <span style={{ fontSize: '0.875rem' }}>{field.label}</span>
              </label>
            )}

            {/* Type: Date */}
            {field.type === 'date' && (
              <input
                id={`df-${field.key}`}
                type="date"
                className="form-input"
                value={val ? String(val).split('T')[0] : ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                disabled={disabled}
                required={field.required}
              />
            )}

            {/* Type: Single Select */}
            {field.type === 'single_select' && (
              <select
                id={`df-${field.key}`}
                className="form-select"
                value={val}
                onChange={(e) => onChange(field.key, e.target.value)}
                disabled={disabled}
                required={field.required}
              >
                <option value="">-- Chọn {field.label} --</option>
                {(field.options || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {/* Type: Multi Select */}
            {field.type === 'multi_select' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '6px 0' }}>
                {(field.options || []).map((opt) => {
                  const isChecked = Array.isArray(val) && val.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleMultiSelectToggle(field.key, opt)}
                      disabled={disabled}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        border: isChecked ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                        background: isChecked ? 'var(--color-primary-light)' : 'var(--bg-surface)',
                        color: isChecked ? 'var(--color-primary-dark)' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isChecked ? '✓ ' : ''}{opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Type: URL */}
            {field.type === 'url' && (
              <input
                id={`df-${field.key}`}
                type="url"
                className="form-input"
                placeholder="https://..."
                value={val}
                onChange={(e) => onChange(field.key, e.target.value)}
                disabled={disabled}
                required={field.required}
              />
            )}

            {/* Type: Image Ref (Google Drive Media) */}
            {field.type === 'image_ref' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {val ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/v1/media/${val}/view`}
                      alt={field.label}
                      style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveImageFieldKey(field.key)}
                    >
                      Đổi ảnh
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onChange(field.key, null)}
                    >
                      Xóa
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveImageFieldKey(field.key)}
                  >
                    Chọn ảnh Google Drive
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal chọn ảnh cho field image_ref */}
      {activeImageFieldKey && (
        <MediaSelectModal
          isOpen={true}
          onClose={() => setActiveImageFieldKey(null)}
          mode="single"
          title="Chọn ảnh Google Drive cho thuộc tính tùy chỉnh"
          onSelect={(selected) => {
            if (selected[0]) {
              onChange(activeImageFieldKey, selected[0]._id);
            }
          }}
        />
      )}
    </div>
  );
}
