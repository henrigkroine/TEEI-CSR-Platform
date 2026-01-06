import type { Preview } from '@storybook/react';
import React from 'react';

/**
 * Storybook Preview Configuration
 * Global decorators, parameters, and theming
 */

// Global CSS import (if needed)
// import '../apps/corp-cockpit-astro/src/styles/global.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a202c',
        },
        {
          name: 'cockpit-bg',
          value: '#f7fafc',
        },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1920px', height: '1080px' },
        },
      },
    },
    // Chromatic configuration
    chromatic: {
      delay: 300,
      diffThreshold: 0.2,
      pauseAnimationAtEnd: true,
    },
  },

  // Global decorators
  decorators: [
    (Story) => (
      <div style={{ padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],

  tags: ['autodocs'],
};

export default preview;
