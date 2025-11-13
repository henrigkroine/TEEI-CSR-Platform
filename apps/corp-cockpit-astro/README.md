# Corporate Cockpit - Astro Frontend

Executive Analytics Dashboard for the TEEI CSR Platform.

## Features

- **At-a-Glance Dashboard**: Key metrics and KPIs
- **Trend Analysis**: Historical data visualization with Chart.js
- **Q2Q Feed**: Qualitative insights and outcome tracking
- **SROI Panel**: Social Return on Investment metrics
- **VIS Panel**: Volunteer Impact Score tracking
- **Multi-language Support**: English, Ukrainian, Norwegian
- **JWT Authentication**: Secure access with API Gateway integration
- **Responsive Design**: Mobile-first Tailwind CSS
- **Dark Mode**: Automatic theme detection

## Tech Stack

- **Astro 5**: Modern web framework with SSR
- **React 18**: Interactive components
- **TypeScript**: Type-safe development
- **Tailwind CSS 3**: Utility-first styling
- **Chart.js**: Data visualization
- **JWT**: Authentication

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0

## Installation

```bash
# From repository root
pnpm install
```

## Development

```bash
# Start development server (port 3008)
pnpm --filter @teei/corp-cockpit-astro dev

# Or from the app directory
cd apps/corp-cockpit-astro
pnpm dev
```

## Build

```bash
# Build for production
pnpm --filter @teei/corp-cockpit-astro build

# Preview production build
pnpm --filter @teei/corp-cockpit-astro preview
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `JWT_SECRET`: JWT secret key (must match api-gateway)
- `ANALYTICS_SERVICE_URL`: Analytics service endpoint (default: http://localhost:3007)
- `API_GATEWAY_URL`: API Gateway endpoint (default: http://localhost:3000)

## Project Structure

```
apps/corp-cockpit-astro/
├── src/
│   ├── components/       # React components
│   │   ├── KPICard.tsx
│   │   ├── Chart.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   └── Navigation.astro
│   ├── layouts/
│   │   └── Layout.astro  # Main layout
│   ├── pages/            # Route pages
│   │   ├── index.astro   # Dashboard
│   │   ├── trends.astro  # Trends
│   │   ├── q2q.astro     # Q2Q Feed
│   │   ├── sroi.astro    # SROI
│   │   ├── vis.astro     # VIS
│   │   └── login.astro   # Login
│   ├── lib/
│   │   ├── i18n.ts       # Translation utilities
│   │   └── api.ts        # API client
│   ├── i18n/             # Translation files
│   │   ├── en.json
│   │   ├── uk.json
│   │   └── no.json
│   ├── styles/
│   │   └── global.css    # Global styles
│   ├── middleware.ts     # JWT authentication
│   └── env.d.ts          # TypeScript definitions
├── public/               # Static assets
├── astro.config.mjs      # Astro configuration
├── tailwind.config.mjs   # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies
```

## Authentication

The app uses JWT-based authentication:

1. All routes except `/login` require authentication
2. JWT token can be provided via:
   - `Authorization: Bearer <token>` header
   - `token` cookie
3. On failed authentication, users are redirected to `/login`
4. Token verification uses the same `JWT_SECRET` as the API Gateway

## i18n (Internationalization)

Language detection priority:

1. URL parameter: `?lang=en`
2. Cookie: `lang=en`
3. Accept-Language header
4. Default: English

Change language using the LanguageSwitcher component in the navigation.

## API Integration

The app communicates with:

- **Analytics Service** (port 3007): Dashboard data, trends, Q2Q feed, SROI, VIS
- **API Gateway** (port 3000): Authentication, proxying

Use the `createApiClient()` utility from `src/lib/api.ts` for API calls.

## License

MIT
