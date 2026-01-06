# TEEI Corporate Cockpit (Astro Frontend)

The **Corporate Cockpit** is the premium executive dashboard for the TEEI CSR Platform. It provides corporate partners with real-time visibility into their social impact, volunteer engagement, and programme performance.

Built with **Astro 5** and **React 18**, it delivers a high-performance, server-first experience with interactive "islands" for dynamic data visualization.

---

## 🌟 Key Features

### 📊 Executive Analytics
- **At-a-Glance Dashboard**: High-level KPIs (SROI, VIS, Coverage, Compliance).
- **Trend Analysis**: Historical performance data visualized with optimized charts.
- **AI Insights**: Automated qualitative-to-quantitative (Q2Q) narrative generation.

### 🌍 Programme Modules
- **Language for Ukraine (LFU)**: Dedicated dashboard for volunteer language tuition metrics.
  - *New*: Real-time mentor leaderboards and CSV data import.
- **Mentorship**: Tracking for professional mentorship sessions.
- **Upskilling**: Progress monitoring for learner courses.

### 💼 Enterprise Grade
- **Premium Design System**: "Teal & Gold" executive aesthetic with dark mode support.
- **Multi-Tenant Architecture**: Strict data isolation per `companyId`.
- **RBAC & SSO**: Integrated with TEEI Identity service.
- **Internationalization**: Full support for English (EN), Ukrainian (UK), and Norwegian (NO).

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | **Astro 5** | Server-Side Rendering (SSR), Routing, Performance |
| **UI Library** | **React 18** | Interactive Widgets (Islands), State Management |
| **Styling** | **Tailwind CSS 3** | Utility-first styling, CSS Variables for Theming |
| **Visualization** | **Chart.js** | Performance-optimized data charts |
| **Real-time** | **SSE** | Server-Sent Events for live metric updates |
| **Build** | **Vite** | Fast bundling and HMR |

---

## 📂 Project Structure

```text
apps/corp-cockpit-astro/
├── src/
│   ├── components/
│   │   ├── dashboard/       # Main dashboard widgets (KPIs, Pipeline)
│   │   ├── programmes/      # Programme-specific modules
│   │   │   └── lfu/         # Language for Ukraine components
│   │   ├── charts/          # Reusable chart components
│   │   └── admin/           # Admin studio components
│   ├── layouts/
│   │   ├── CockpitLayout.astro    # Main shell (Sidebar, Topbar)
│   │   └── BaseLayout.astro       # HTML root and SEO
│   ├── pages/
│   │   └── [lang]/
│   │       └── cockpit/
│   │           └── [companyId]/   # Tenant-scoped routes
│   │               ├── index.astro
│   │               └── programmes/
│   │                   └── language-for-ukraine.astro
│   ├── features/            # Feature-based verticals (Importer, Offline, etc.)
│   ├── styles/              # Global CSS and Design Tokens
│   └── lib/                 # Shared utilities and API clients
└── public/                  # Static assets
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 8.0.0

### Installation
```bash
# From monorepo root
pnpm install
```

### Development
Start the development server with hot module replacement:
```bash
pnpm --filter @teei/corp-cockpit-astro dev
# Access at http://localhost:3008 (or configured port)
```

### Production Build
```bash
pnpm --filter @teei/corp-cockpit-astro build
pnpm --filter @teei/corp-cockpit-astro start
```

---

## 🎨 Design System

The cockpit uses a token-based design system defined in `src/styles/global.css` and `src/styles/themes.ts`.

- **Primary**: Teal (`#00393f`) - Authority, Trust.
- **Accent**: Gold (`#BA8F5A`) - Premium, Impact.
- **Typography**: Inter (UI) + JetBrains Mono (Data).

Components should use `text-primary`, `bg-surface`, `border-subtle` etc., to ensure compatibility with theming and dark mode.

---

## 🔌 API Integration

The frontend connects to the TEEI microservices mesh:
- **Analytics Service**: Metrics aggregation and calculation.
- **Identity Service**: Auth and tenant management.
- **Impact-In Service**: Data ingestion pipeline.

---

## 📝 License

Copyright © TEEI. All rights reserved.
