/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly JWT_SECRET: string;
  readonly ANALYTICS_SERVICE_URL: string;
  readonly API_GATEWAY_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    user?: {
      userId: string;
      email: string;
      role: string;
      organizationId?: string;
    };
    isAuthenticated: boolean;
  }
}
