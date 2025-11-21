# Trust Center Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the TEEI Trust Center to production environments. The Trust Center is a static Astro 5 application with server-side API routes, optimized for edge deployment on Vercel, Netlify, or Node.js servers.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Vercel Deployment](#vercel-deployment)
- [Netlify Deployment](#netlify-deployment)
- [Node.js Server](#nodejs-server)
- [CDN Configuration](#cdn-configuration)
- [Monitoring Setup](#monitoring-setup)
- [Security Hardening](#security-hardening)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Software Requirements

- **Node.js**: 20 LTS (recommended)
- **pnpm**: 8.x or higher
- **Docker**: 24.x or higher (for containerized deployment)
- **PostgreSQL**: 14+ (for backend API connections)

### Access Requirements

- **GitHub Repository**: Access to TEEI-CSR-Platform repo
- **AWS Account**: For S3, CloudFront, Secrets Manager (if using AWS)
- **Domain**: Configured DNS for custom domain
- **SSL Certificate**: Valid SSL/TLS certificate (managed or custom)

### Build Machine Requirements

- **CPU**: 2+ cores
- **RAM**: 4 GB minimum, 8 GB recommended
- **Disk**: 10 GB available space
- **Network**: Outbound internet access for npm packages

---

## Environment Configuration

### Environment Variables

Create a `.env.production` file in `apps/trust-center/`:

```bash
# API Configuration
PUBLIC_API_GATEWAY_URL=https://api.teei.io/v1
PUBLIC_TRUST_API_URL=https://api.teei.io/v1/trust

# Database (for server-side routes)
DATABASE_URL=postgresql://user:password@postgres.teei.io:5432/teei_prod

# Feature Flags
PUBLIC_FEATURE_TRUST_CENTER=true
PUBLIC_FEATURE_EVIDENCE_GATES=true

# Analytics
PUBLIC_ANALYTICS_ID=G-XXXXXXXXXX
PUBLIC_GTM_ID=GTM-XXXXXXX

# Environment
PUBLIC_ENV=production
NODE_ENV=production

# Security
LEDGER_SECRET_KEY=<48-char-secret-from-secrets-manager>
CSP_NONCE=<random-nonce-per-request>

# CDN
PUBLIC_CDN_URL=https://cdn.teei.io
PUBLIC_ASSET_PREFIX=https://cdn.teei.io/trust-center

# Monitoring
SENTRY_DSN=https://abc123@sentry.io/123456
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.teei.io/v1/traces

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Cache
CACHE_TTL=3600
REDIS_URL=redis://redis.teei.io:6379
```

### Secrets Management

**AWS Secrets Manager** (Recommended):

```bash
# Store secrets
aws secretsmanager create-secret \
  --name teei/trust-center/prod \
  --secret-string '{
    "DATABASE_URL": "postgresql://...",
    "LEDGER_SECRET_KEY": "...",
    "SENTRY_DSN": "..."
  }'

# Retrieve at runtime
aws secretsmanager get-secret-value \
  --secret-id teei/trust-center/prod \
  --query SecretString \
  --output text > .env.production
```

**HashiCorp Vault**:

```bash
# Store secrets
vault kv put secret/teei/trust-center/prod \
  DATABASE_URL="postgresql://..." \
  LEDGER_SECRET_KEY="..." \
  SENTRY_DSN="..."

# Retrieve at runtime
vault kv get -format=json secret/teei/trust-center/prod | \
  jq -r '.data.data | to_entries | .[] | "\(.key)=\(.value)"' > .env.production
```

### Build Configuration

**Astro Config** (`astro.config.mjs`):

```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless'; // or netlify, node

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'hybrid', // Static pages + server routes
  adapter: vercel(), // or netlify(), node()
  build: {
    inlineStylesheets: 'auto',
    assets: '_astro'
  },
  vite: {
    build: {
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: false // Disable sourcemaps in production
    }
  },
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  }
});
```

---

## Docker Deployment

### Dockerfile

**File**: `apps/trust-center/Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/trust-center/package.json apps/trust-center/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/trust-center ./apps/trust-center

# Build application
WORKDIR /app/apps/trust-center
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
RUN npm install -g pnpm@8
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/trust-center/package.json ./apps/trust-center/
RUN pnpm install --prod --frozen-lockfile

# Copy build artifacts
COPY --from=builder /app/apps/trust-center/dist ./apps/trust-center/dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { if (r.statusCode !== 200) throw new Error('Unhealthy'); })"

# Run application
CMD ["node", "apps/trust-center/dist/server/entry.mjs"]
```

### Docker Compose

**File**: `apps/trust-center/docker-compose.yml`

```yaml
version: '3.8'

services:
  trust-center:
    build:
      context: ../..
      dockerfile: apps/trust-center/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - LEDGER_SECRET_KEY=${LEDGER_SECRET_KEY}
      - PUBLIC_API_GATEWAY_URL=${PUBLIC_API_GATEWAY_URL}
      - PUBLIC_TRUST_API_URL=${PUBLIC_TRUST_API_URL}
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    networks:
      - teei-network
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: teei_prod
      POSTGRES_USER: teei
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - teei-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - teei-network

volumes:
  postgres-data:
  redis-data:

networks:
  teei-network:
    driver: bridge
```

### Build and Run

```bash
# Build image
docker build -t teei-trust-center:latest -f apps/trust-center/Dockerfile .

# Run container
docker run -d \
  --name trust-center \
  -p 3000:3000 \
  --env-file apps/trust-center/.env.production \
  teei-trust-center:latest

# View logs
docker logs -f trust-center

# Check health
curl http://localhost:3000/api/health
```

### Docker Swarm (Multi-Node)

```bash
# Initialize swarm
docker swarm init

# Create secret
echo "$LEDGER_SECRET_KEY" | docker secret create ledger_secret_key -

# Deploy stack
docker stack deploy -c docker-compose.yml teei-trust-center

# Scale service
docker service scale teei-trust-center_trust-center=3

# View services
docker service ls
```

---

## Vercel Deployment

### Prerequisites

- Vercel account with CLI access
- Project linked to GitHub repository

### Vercel Configuration

**File**: `apps/trust-center/vercel.json`

```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "astro",
  "outputDirectory": "dist",
  "regions": ["iad1"],
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2))",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/index.html",
      "destination": "/",
      "permanent": true
    }
  ],
  "env": {
    "PUBLIC_API_GATEWAY_URL": "https://api.teei.io/v1",
    "PUBLIC_TRUST_API_URL": "https://api.teei.io/v1/trust",
    "PUBLIC_FEATURE_TRUST_CENTER": "true"
  }
}
```

### Deploy to Vercel

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Link project
vercel link

# Set environment variables
vercel env add DATABASE_URL production
vercel env add LEDGER_SECRET_KEY production
vercel env add SENTRY_DSN production

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Custom Domain

```bash
# Add custom domain
vercel domains add trust.teei.io

# Verify DNS
vercel domains verify trust.teei.io
```

---

## Netlify Deployment

### Netlify Configuration

**File**: `apps/trust-center/netlify.toml`

```toml
[build]
  command = "pnpm build"
  publish = "dist"
  functions = "dist/functions"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Deploy to Netlify

```bash
# Install Netlify CLI
pnpm add -g netlify-cli

# Login
netlify login

# Initialize project
netlify init

# Set environment variables
netlify env:set DATABASE_URL "$DATABASE_URL"
netlify env:set LEDGER_SECRET_KEY "$LEDGER_SECRET_KEY"

# Deploy to preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

---

## Node.js Server

### Production Server

**File**: `apps/trust-center/server.js`

```javascript
import { handler as ssrHandler } from './dist/server/entry.mjs';
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{random}'"],
      styleSrc: ["'self'", "'nonce-{random}'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.teei.io"],
      fontSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Compression
app.use(compression());

// Static assets with cache headers
app.use('/_astro', express.static('./dist/_astro', {
  maxAge: '1y',
  immutable: true
}));

app.use('/assets', express.static('./dist/assets', {
  maxAge: '1y',
  immutable: true
}));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// SSR handler
app.use(ssrHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Trust Center running on port ${PORT}`);
});
```

### PM2 Configuration

**File**: `apps/trust-center/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'trust-center',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### Deploy with PM2

```bash
# Install PM2
pnpm add -g pm2

# Build application
pnpm build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup

# View logs
pm2 logs trust-center

# Monitor
pm2 monit
```

---

## CDN Configuration

### CloudFront (AWS)

**Distribution Settings**:

```yaml
DistributionConfig:
  Enabled: true
  DefaultRootObject: index.html
  Origins:
    - DomainName: trust-center.vercel.app
      Id: trust-center-origin
      CustomOriginConfig:
        HTTPSPort: 443
        OriginProtocolPolicy: https-only
  DefaultCacheBehavior:
    TargetOriginId: trust-center-origin
    ViewerProtocolPolicy: redirect-to-https
    AllowedMethods:
      - GET
      - HEAD
      - OPTIONS
    CachedMethods:
      - GET
      - HEAD
    Compress: true
    CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6 # CachingOptimized
  CacheBehaviors:
    - PathPattern: /api/*
      TargetOriginId: trust-center-origin
      ViewerProtocolPolicy: https-only
      CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad # CachingDisabled
    - PathPattern: /_astro/*
      TargetOriginId: trust-center-origin
      ViewerProtocolPolicy: https-only
      CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
      Compress: true
  Aliases:
    - trust.teei.io
  ViewerCertificate:
    AcmCertificateArn: arn:aws:acm:us-east-1:123456789:certificate/abc123
    SslSupportMethod: sni-only
    MinimumProtocolVersion: TLSv1.2_2021
```

### Cloudflare

**Page Rules**:

```yaml
- URL: trust.teei.io/api/*
  Settings:
    Cache Level: Bypass
    Security Level: High

- URL: trust.teei.io/_astro/*
  Settings:
    Cache Level: Cache Everything
    Edge Cache TTL: 1 year
    Browser Cache TTL: 1 year

- URL: trust.teei.io/*
  Settings:
    Cache Level: Standard
    Browser Cache TTL: 1 hour
    Always Use HTTPS: On
    Automatic HTTPS Rewrites: On
```

---

## Monitoring Setup

### Sentry Configuration

**File**: `apps/trust-center/src/lib/sentry.ts`

```typescript
import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: import.meta.env.SENTRY_DSN,
  environment: import.meta.env.PUBLIC_ENV,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter out PII
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  }
});
```

### OpenTelemetry

**File**: `apps/trust-center/src/lib/otel.ts`

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'trust-center',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0'
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  })
});

sdk.start();
```

### Prometheus Metrics

**Endpoint**: `/api/metrics`

```typescript
import { register, Counter, Histogram } from 'prom-client';

// Request counter
const requestCounter = new Counter({
  name: 'trust_center_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// Response time histogram
const responseTimeHistogram = new Histogram({
  name: 'trust_center_response_time_ms',
  help: 'HTTP response time in ms',
  labelNames: ['method', 'route'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
});

export async function GET() {
  return new Response(await register.metrics(), {
    headers: { 'Content-Type': register.contentType }
  });
}
```

---

## Security Hardening

### CSP Headers

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'nonce-{random}';
  img-src 'self' data: https:;
  connect-src 'self' https://api.teei.io;
  font-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### HTTPS Enforcement

```nginx
server {
    listen 80;
    server_name trust.teei.io;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name trust.teei.io;

    ssl_certificate /etc/ssl/certs/trust.teei.io.crt;
    ssl_certificate_key /etc/ssl/private/trust.teei.io.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
}
```

### Secrets Rotation

```bash
# Rotate LEDGER_SECRET_KEY every 90 days
# 1. Generate new key
NEW_KEY=$(openssl rand -base64 48)

# 2. Update secrets manager
aws secretsmanager put-secret-value \
  --secret-id teei/trust-center/prod \
  --secret-string "{\"LEDGER_SECRET_KEY\": \"$NEW_KEY\"}"

# 3. Restart application
kubectl rollout restart deployment/trust-center
```

---

## Troubleshooting

### Build Failures

**Problem**: TypeScript errors during build

**Solution**:
```bash
# Clear cache
rm -rf .astro node_modules/.cache dist

# Reinstall dependencies
pnpm install

# Run typecheck
pnpm typecheck

# Rebuild
pnpm build
```

### Runtime Errors

**Problem**: "Database connection failed"

**Solution**:
1. Verify `DATABASE_URL` in environment
2. Check network connectivity to database
3. Review database credentials
4. Check firewall rules

**Problem**: "LEDGER_SECRET_KEY not found"

**Solution**:
1. Verify secret exists in secrets manager
2. Check IAM permissions for secret access
3. Restart application after updating secret

### Performance Issues

**Problem**: Slow API responses (>2s)

**Solution**:
1. Check database query performance
2. Enable Redis caching
3. Review CDN cache hit rate
4. Scale horizontally (add more instances)

---

## Related Documentation

- [Trust Center Overview](./README.md)
- [Evidence Gates](./evidence-gates.md)
- [Evidence Ledger](./evidence-ledger.md)
- [Trust API Endpoints](../api/trust-endpoints.md)

---

**Last Updated**: November 2025
**Version**: 1.0.0
**Maintained By**: Agent 5.1 - Technical Writer
