import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook Main Configuration
 * TEEI Corporate Cockpit - Component Library
 * Phase D Deliverable K
 */
const config: StorybookConfig = {
  stories: [
    '../apps/corp-cockpit-astro/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../apps/corp-cockpit-astro/src/**/*.story.@(js|jsx|ts|tsx)',
  ],

  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-coverage',
    '@chromatic-com/storybook',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  docs: {
    autodocs: 'tag',
  },

  staticDirs: ['../apps/corp-cockpit-astro/public'],

  viteFinal: async (config) => {
    // Customize Vite config for Storybook
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': '/apps/corp-cockpit-astro/src',
        },
      },
    };
  },

  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
};

export default config;
