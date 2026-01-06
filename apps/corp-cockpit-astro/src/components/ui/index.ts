/**
 * TEEI Corporate Cockpit — UI Components
 * 
 * Export all shared UI components.
 */

// Modal
export { default as Modal, ModalFooter, ModalActions, ConfirmDialog, useModal } from './Modal';
export type { ModalProps, ConfirmDialogProps } from './Modal';

// Empty States
export { 
  default as EmptyState,
  NoCampaignsEmpty,
  NoVolunteersEmpty,
  NoEvidenceEmpty,
  NoReportsEmpty,
  NoSearchResultsEmpty,
  NoEventsEmpty,
  EmptyInboxState,
} from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

// Form Controls
export {
  Input,
  Textarea,
  Select,
  Checkbox,
  RadioGroup,
  Switch,
} from './FormControls';
export type {
  InputProps,
  TextareaProps,
  SelectProps,
  CheckboxProps,
  RadioOption,
  RadioGroupProps,
  SwitchProps,
} from './FormControls';

// Loading States
export {
  Spinner,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  LoadingOverlay,
  ButtonSpinner,
  PageLoader,
} from './Loading';
export type {
  SpinnerProps,
  SkeletonProps,
  LoadingOverlayProps,
} from './Loading';

// Table
export { default as Table, TableActions, StatusBadge } from './Table';
export type { TableColumn, TableProps, StatusType } from './Table';

// Toast
export { ToastProvider, useToast } from './Toast';
export type { Toast, ToastType } from './Toast';

// Dropdown
export { default as Dropdown } from './Dropdown';
export type { DropdownItem, DropdownProps } from './Dropdown';

// Navigation
export { Breadcrumbs, Tabs, Pagination } from './Navigation';
export type { BreadcrumbItem, BreadcrumbsProps, Tab, TabsProps, PaginationProps } from './Navigation';

// PageHeader
export { default as PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

// ToastProviderWrapper
export { default as ToastProviderWrapper } from './ToastProviderWrapper';

