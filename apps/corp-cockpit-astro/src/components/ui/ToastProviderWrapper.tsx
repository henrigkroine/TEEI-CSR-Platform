/**
 * ToastProviderWrapper — Client-side wrapper for ToastProvider
 * 
 * Use this in Astro pages that need toast notifications.
 * Wrap your React components with this.
 */

import React from 'react';
import { ToastProvider } from './Toast';

export default function ToastProviderWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}



