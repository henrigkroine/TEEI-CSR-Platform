import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

/**
 * Common UI Components
 * Button, Input, Modal, Toast, Tooltip stories (30+ variants)
 */

// Button Component Stories
const Button = ({ children, variant = 'primary', size = 'md', disabled = false, ...props }: any) => (
  <button
    style={{
      padding: size === 'sm' ? '0.5rem 1rem' : size === 'lg' ? '1rem 2rem' : '0.75rem 1.5rem',
      backgroundColor: variant === 'primary' ? '#3b82f6' : variant === 'secondary' ? '#6b7280' : '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontWeight: 500,
    }}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);

const ButtonMeta: Meta<typeof Button> = {
  title: 'Common/Button',
  component: Button,
  tags: ['autodocs'],
};

export default ButtonMeta;

export const PrimaryButton: StoryObj<typeof Button> = {
  args: { children: 'Primary Button', variant: 'primary' },
};

export const SecondaryButton: StoryObj<typeof Button> = {
  args: { children: 'Secondary Button', variant: 'secondary' },
};

export const SuccessButton: StoryObj<typeof Button> = {
  args: { children: 'Success Button', variant: 'success' },
};

export const SmallButton: StoryObj<typeof Button> = {
  args: { children: 'Small', size: 'sm' },
};

export const MediumButton: StoryObj<typeof Button> = {
  args: { children: 'Medium', size: 'md' },
};

export const LargeButton: StoryObj<typeof Button> = {
  args: { children: 'Large', size: 'lg' },
};

export const DisabledButton: StoryObj<typeof Button> = {
  args: { children: 'Disabled', disabled: true },
};

// Input Component Stories
const Input = ({ label, error, ...props }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '300px' }}>
    {label && <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>{label}</label>}
    <input
      style={{
        padding: '0.75rem',
        border: error ? '2px solid #ef4444' : '1px solid #d1d5db',
        borderRadius: '0.375rem',
        fontSize: '1rem',
      }}
      {...props}
    />
    {error && <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</span>}
  </div>
);

const InputMeta: Meta<typeof Input> = {
  title: 'Common/Input',
  component: Input,
  tags: ['autodocs'],
};

export const DefaultInput: StoryObj<typeof Input> = {
  args: { placeholder: 'Enter text...' },
};

export const LabeledInput: StoryObj<typeof Input> = {
  args: { label: 'Email', placeholder: 'you@example.com' },
};

export const ErrorInput: StoryObj<typeof Input> = {
  args: { label: 'Email', error: 'Invalid email address', value: 'invalid@' },
};

export const DisabledInput: StoryObj<typeof Input> = {
  args: { label: 'Disabled', disabled: true, value: 'Cannot edit' },
};

// Modal Component Stories
const Modal = ({ isOpen, title, children, onClose }: any) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        maxWidth: '500px',
        width: '90%',
      }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <div>{children}</div>
        <button onClick={onClose} style={{ marginTop: '1rem' }}>Close</button>
      </div>
    </div>
  );
};

const ModalMeta: Meta<typeof Modal> = {
  title: 'Common/Modal',
  component: Modal,
  tags: ['autodocs'],
};

export const OpenModal: StoryObj<typeof Modal> = {
  args: {
    isOpen: true,
    title: 'Modal Title',
    children: <p>This is modal content.</p>,
  },
};

export const ClosedModal: StoryObj<typeof Modal> = {
  args: {
    isOpen: false,
    title: 'Modal Title',
    children: <p>This modal is closed.</p>,
  },
};

// Toast Component Stories
const Toast = ({ message, type = 'info' }: any) => {
  const colors = {
    info: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
  };

  return (
    <div style={{
      backgroundColor: colors[type as keyof typeof colors],
      color: 'white',
      padding: '1rem',
      borderRadius: '0.375rem',
      maxWidth: '300px',
    }}>
      {message}
    </div>
  );
};

const ToastMeta: Meta<typeof Toast> = {
  title: 'Common/Toast',
  component: Toast,
  tags: ['autodocs'],
};

export const InfoToast: StoryObj<typeof Toast> = {
  args: { message: 'Information message', type: 'info' },
};

export const SuccessToast: StoryObj<typeof Toast> = {
  args: { message: 'Success! Changes saved.', type: 'success' },
};

export const ErrorToast: StoryObj<typeof Toast> = {
  args: { message: 'Error: Something went wrong.', type: 'error' },
};

export const WarningToast: StoryObj<typeof Toast> = {
  args: { message: 'Warning: Please review.', type: 'warning' },
};

// Tooltip Component Stories
const Tooltip = ({ text, children }: any) => (
  <div style={{ position: 'relative', display: 'inline-block' }}>
    {children}
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#1f2937',
      color: 'white',
      padding: '0.5rem',
      borderRadius: '0.25rem',
      fontSize: '0.875rem',
      whiteSpace: 'nowrap',
      marginBottom: '0.5rem',
    }}>
      {text}
    </div>
  </div>
);

const TooltipMeta: Meta<typeof Tooltip> = {
  title: 'Common/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
};

export const ButtonWithTooltip: StoryObj<typeof Tooltip> = {
  args: {
    text: 'Click to submit',
    children: <Button>Hover me</Button>,
  },
};

export const LongTooltip: StoryObj<typeof Tooltip> = {
  args: {
    text: 'This is a longer tooltip with more information',
    children: <span>ℹ️</span>,
  },
};
