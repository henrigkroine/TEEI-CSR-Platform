/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly REPORTING_SERVICE_URL: string;
  readonly JWT_SECRET: string;
  readonly SESSION_COOKIE_NAME: string;
  readonly SESSION_SECRET: string;
  readonly NODE_ENV: 'development' | 'production' | 'test';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
