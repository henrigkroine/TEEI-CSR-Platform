/**
 * FormControls — Premium form input components
 * 
 * Polished, accessible form controls with consistent styling.
 */

import React, { forwardRef, useState, useId } from 'react';

// =============================================================================
// INPUT
// =============================================================================

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  helperText,
  error,
  success,
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  id: providedId,
  disabled,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const hasError = !!error;
  const sizeClass = `input-${size}`;

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
        </label>
      )}
      
      <div className={`input-wrapper ${leftIcon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''}`}>
        {leftIcon && <span className="input-icon input-icon-left">{leftIcon}</span>}
        
        <input
          ref={ref}
          id={id}
          className={`
            form-input ${sizeClass}
            ${hasError ? 'input-error' : ''}
            ${success ? 'input-success' : ''}
            ${className}
          `}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined
          }
          {...props}
        />
        
        {rightIcon && <span className="input-icon input-icon-right">{rightIcon}</span>}
      </div>
      
      {(error || helperText) && (
        <p 
          id={hasError ? `${id}-error` : `${id}-helper`}
          className={`form-helper ${hasError ? 'form-helper-error' : ''}`}
        >
          {error || helperText}
        </p>
      )}

      <style>{`
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          font-family: var(--font-family);
          font-size: var(--text-sm);
          color: var(--color-text-primary);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          transition: 
            border-color var(--duration-fast) var(--ease-out),
            box-shadow var(--duration-fast) var(--ease-out),
            background-color var(--duration-fast) var(--ease-out);
        }

        .form-input::placeholder {
          color: var(--color-text-tertiary);
        }

        .form-input:hover:not(:disabled) {
          border-color: var(--color-border-strong);
        }

        .form-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(10, 89, 97, 0.12);
        }

        .form-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--color-muted);
        }

        /* Sizes */
        .input-sm {
          padding: 8px 12px;
          font-size: var(--text-xs);
          border-radius: var(--radius-md);
        }

        .input-md {
          padding: 10px 14px;
        }

        .input-lg {
          padding: 14px 18px;
          font-size: var(--text-base);
        }

        /* States */
        .input-error {
          border-color: var(--color-error);
        }

        .input-error:focus {
          border-color: var(--color-error);
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
        }

        .input-success {
          border-color: var(--color-success);
        }

        .input-success:focus {
          border-color: var(--color-success);
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12);
        }

        /* Icons */
        .input-icon {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          color: var(--color-text-tertiary);
          pointer-events: none;
        }

        .input-icon-left {
          left: 12px;
        }

        .input-icon-right {
          right: 12px;
        }

        .has-left-icon .form-input {
          padding-left: 40px;
        }

        .has-right-icon .form-input {
          padding-right: 40px;
        }

        /* Helper text */
        .form-helper {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          margin: 0;
        }

        .form-helper-error {
          color: var(--color-error);
        }
      `}</style>
    </div>
  );
});

Input.displayName = 'Input';

// =============================================================================
// TEXTAREA
// =============================================================================

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  helperText,
  error,
  resize = 'vertical',
  className = '',
  id: providedId,
  rows = 4,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const hasError = !!error;

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
        </label>
      )}
      
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={`form-textarea ${hasError ? 'input-error' : ''} ${className}`}
        style={{ resize }}
        aria-invalid={hasError}
        aria-describedby={
          hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        {...props}
      />
      
      {(error || helperText) && (
        <p 
          id={hasError ? `${id}-error` : `${id}-helper`}
          className={`form-helper ${hasError ? 'form-helper-error' : ''}`}
        >
          {error || helperText}
        </p>
      )}

      <style>{`
        .form-textarea {
          width: 100%;
          padding: 12px 14px;
          font-family: var(--font-family);
          font-size: var(--text-sm);
          line-height: var(--leading-relaxed);
          color: var(--color-text-primary);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          transition: 
            border-color var(--duration-fast) var(--ease-out),
            box-shadow var(--duration-fast) var(--ease-out);
        }

        .form-textarea::placeholder {
          color: var(--color-text-tertiary);
        }

        .form-textarea:hover:not(:disabled) {
          border-color: var(--color-border-strong);
        }

        .form-textarea:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(10, 89, 97, 0.12);
        }

        .form-textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--color-muted);
        }
      `}</style>
    </div>
  );
});

Textarea.displayName = 'Textarea';

// =============================================================================
// SELECT
// =============================================================================

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  helperText,
  error,
  options,
  placeholder,
  className = '',
  id: providedId,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const hasError = !!error;

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
        </label>
      )}
      
      <div className="select-wrapper">
        <select
          ref={ref}
          id={id}
          className={`form-select ${hasError ? 'input-error' : ''} ${className}`}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        <span className="select-chevron">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path 
              d="M4 6l4 4 4-4" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      
      {(error || helperText) && (
        <p 
          id={hasError ? `${id}-error` : `${id}-helper`}
          className={`form-helper ${hasError ? 'form-helper-error' : ''}`}
        >
          {error || helperText}
        </p>
      )}

      <style>{`
        .select-wrapper {
          position: relative;
        }

        .form-select {
          width: 100%;
          padding: 10px 40px 10px 14px;
          font-family: var(--font-family);
          font-size: var(--text-sm);
          color: var(--color-text-primary);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          appearance: none;
          transition: 
            border-color var(--duration-fast) var(--ease-out),
            box-shadow var(--duration-fast) var(--ease-out);
        }

        .form-select:hover:not(:disabled) {
          border-color: var(--color-border-strong);
        }

        .form-select:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(10, 89, 97, 0.12);
        }

        .form-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--color-muted);
        }

        .select-chevron {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--color-text-tertiary);
        }
      `}</style>
    </div>
  );
});

Select.displayName = 'Select';

// =============================================================================
// CHECKBOX
// =============================================================================

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  description,
  className = '',
  id: providedId,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;

  return (
    <div className={`checkbox-field ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        id={id}
        className="checkbox-input"
        {...props}
      />
      <label htmlFor={id} className="checkbox-label">
        <span className="checkbox-box">
          <svg viewBox="0 0 16 16" fill="none" className="checkbox-icon">
            <path 
              d="M3 8l3 3 7-7" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="checkbox-content">
          <span className="checkbox-text">{label}</span>
          {description && (
            <span className="checkbox-description">{description}</span>
          )}
        </span>
      </label>

      <style>{`
        .checkbox-field {
          display: flex;
        }

        .checkbox-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .checkbox-label {
          display: flex;
          gap: 12px;
          cursor: pointer;
        }

        .checkbox-box {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--color-surface);
          border: 2px solid var(--color-border-strong);
          border-radius: var(--radius-sm);
          transition: all var(--duration-fast) var(--ease-out);
        }

        .checkbox-icon {
          width: 12px;
          height: 12px;
          color: white;
          opacity: 0;
          transform: scale(0.5);
          transition: all var(--duration-fast) var(--ease-spring);
        }

        .checkbox-input:hover + .checkbox-label .checkbox-box {
          border-color: var(--color-primary);
        }

        .checkbox-input:checked + .checkbox-label .checkbox-box {
          background: var(--color-primary);
          border-color: var(--color-primary);
        }

        .checkbox-input:checked + .checkbox-label .checkbox-icon {
          opacity: 1;
          transform: scale(1);
        }

        .checkbox-input:focus-visible + .checkbox-label .checkbox-box {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        .checkbox-input:disabled + .checkbox-label {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .checkbox-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-top: 1px;
        }

        .checkbox-text {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
        }

        .checkbox-description {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

// =============================================================================
// RADIO GROUP
// =============================================================================

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  label?: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  direction?: 'horizontal' | 'vertical';
}

export function RadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  direction = 'vertical',
}: RadioGroupProps) {
  return (
    <fieldset className="radio-group">
      {label && <legend className="radio-group-label">{label}</legend>}
      
      <div className={`radio-options radio-options-${direction}`}>
        {options.map((option) => (
          <div key={option.value} className="radio-field">
            <input
              type="radio"
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={(e) => onChange?.(e.target.value)}
              className="radio-input"
            />
            <label htmlFor={`${name}-${option.value}`} className="radio-label">
              <span className="radio-circle">
                <span className="radio-dot" />
              </span>
              <span className="radio-content">
                <span className="radio-text">{option.label}</span>
                {option.description && (
                  <span className="radio-description">{option.description}</span>
                )}
              </span>
            </label>
          </div>
        ))}
      </div>

      <style>{`
        .radio-group {
          border: none;
          padding: 0;
          margin: 0;
        }

        .radio-group-label {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
          margin-bottom: 12px;
        }

        .radio-options {
          display: flex;
          gap: 16px;
        }

        .radio-options-vertical {
          flex-direction: column;
        }

        .radio-options-horizontal {
          flex-direction: row;
          flex-wrap: wrap;
        }

        .radio-field {
          display: flex;
        }

        .radio-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .radio-label {
          display: flex;
          gap: 12px;
          cursor: pointer;
        }

        .radio-circle {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--color-surface);
          border: 2px solid var(--color-border-strong);
          border-radius: 50%;
          transition: all var(--duration-fast) var(--ease-out);
        }

        .radio-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: white;
          opacity: 0;
          transform: scale(0);
          transition: all var(--duration-fast) var(--ease-spring);
        }

        .radio-input:hover + .radio-label .radio-circle {
          border-color: var(--color-primary);
        }

        .radio-input:checked + .radio-label .radio-circle {
          background: var(--color-primary);
          border-color: var(--color-primary);
        }

        .radio-input:checked + .radio-label .radio-dot {
          opacity: 1;
          transform: scale(1);
        }

        .radio-input:focus-visible + .radio-label .radio-circle {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        .radio-input:disabled + .radio-label {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .radio-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-top: 1px;
        }

        .radio-text {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
        }

        .radio-description {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
        }
      `}</style>
    </fieldset>
  );
}

// =============================================================================
// SWITCH / TOGGLE
// =============================================================================

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(({
  label,
  description,
  className = '',
  id: providedId,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;

  return (
    <div className={`switch-field ${className}`}>
      <label htmlFor={id} className="switch-label">
        <span className="switch-content">
          <span className="switch-text">{label}</span>
          {description && (
            <span className="switch-description">{description}</span>
          )}
        </span>
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className="switch-input"
          role="switch"
          {...props}
        />
        <span className="switch-track">
          <span className="switch-thumb" />
        </span>
      </label>

      <style>{`
        .switch-field {
          display: flex;
        }

        .switch-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          cursor: pointer;
        }

        .switch-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .switch-track {
          position: relative;
          width: 44px;
          height: 24px;
          background: var(--color-muted);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-pill);
          flex-shrink: 0;
          transition: all var(--duration-fast) var(--ease-out);
        }

        .switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
          transition: all var(--duration-fast) var(--ease-spring);
        }

        .switch-input:checked + .switch-track {
          background: var(--color-primary);
          border-color: var(--color-primary);
        }

        .switch-input:checked + .switch-track .switch-thumb {
          left: calc(100% - 20px);
        }

        .switch-input:focus-visible + .switch-track {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        .switch-input:disabled + .switch-track {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .switch-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .switch-text {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
        }

        .switch-description {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
});

Switch.displayName = 'Switch';



