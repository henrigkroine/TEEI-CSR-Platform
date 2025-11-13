# TEEI CSR Platform

## 🚀 Overview

The TEEI CSR Platform is a unified impact measurement and AI-powered ecosystem for corporate social responsibility and youth empowerment. It integrates Buddy, Language Connect (via Kintell), Mentorship (via Kintell), and Upskilling into a single CSR-grade impact and reporting stack.

**Mission**: Transform qualitative social impact into quantifiable business outcomes that corporates can measure, report, and optimize.

## 🎯 Key Features

- **Unified Journey Tracking**: Buddy → Language Connect → Upskilling → Mentorship → Employment
- **Q2Q AI Engine**: Converts qualitative feedback into quantitative outcomes
- **Live SROI Dashboard**: Real-time Social Return on Investment calculations
- **Corporate Cockpit**: Executive dashboards with impact metrics
- **Privacy-First Design**: GDPR-compliant with data segmentation
- **Integration Ready**: APIs for Benevity, Goodera, and Workday

## 🏗️ Architecture

```
Corporate Cockpit (UI) → Reporting Layer → Services → Data Layer
```

Key components:
- Buddy Service (social integration)
- Kintell Connector (language & mentorship)
- Upskilling Connector (credentials & courses)
- Q2Q AI Engine (qualitative to quantitative)
- Safety & Moderation Service

## 📂 Project Structure

```
TEEI_CSR_Platform/
├── 00_Overview/          # Architecture and system documentation
├── 01_Services/          # Service-specific documentation
├── 02_Data_Models/       # Data schemas and models
├── 03_Corporate_Cockpit/ # Dashboard and reporting specs
├── 04_Discord_Integration/
├── 05_AI_Models/
├── 06_Security_Privacy/
├── 07_Roadmap/           # Development phases
└── 99_Notes/             # Research and ideas
```

## 🛠️ Tech Stack

- **Frontend**: Astro 5 + React islands
- **Backend**: Node.js/TypeScript + Fastify
- **Database**: PostgreSQL (Neon) + pgvector
- **Analytics**: ClickHouse/BigQuery
- **AI/ML**: OpenAI APIs, custom NLP models
- **Message Queue**: NATS/Cloudflare Queues
- **Monitoring**: OpenTelemetry + Grafana

## 📊 Impact Metrics

- **Integration Score**: 0-1 scale measuring social integration
- **Language Level**: CEFR-based proficiency tracking
- **Job Readiness**: Composite score from multiple signals
- **VIS**: Volunteer Impact Score
- **SROI**: Social Return on Investment ratio

## 🚦 Development Phases

### Phase A - Foundations ✅
- Unified Profile Service
- Kintell Connector
- Basic Q2Q Pipeline
- Corporate Cockpit v1

### Phase B - Outcomes & Reporting 🔄
- Upskilling Connector
- SROI & VIS Calculators
- Evidence Lineage
- Impact-In API

### Phase C - Orchestration 📋
- Journey Engine
- Discord Bot Integration
- Safety/Moderation Service

### Phase D - Enterprise Polish 🎯
- Advanced Analytics
- Generative Reporting
- Custom KPI Tools

## 🔐 Security & Privacy

- Privacy-by-design architecture
- PII/PHI data segmentation
- Field-level encryption
- Consent management
- RBAC & tenant isolation

## 🤝 Integration Partners

- **Kintell**: Language Connect & Mentorship platform
- **Benevity/Goodera**: CSR reporting platforms
- **Discord**: Community engagement
- **eCornell/itslearning**: Upskilling providers

## 📚 Documentation

For detailed documentation, see the [Platform Documentation](./00_Overview/Platform_Architecture.md) or browse individual service docs in their respective folders.

## 🛡️ License

Proprietary - TEEI (The Extraordinarily Empowering Initiative)

## 👥 Team

Owner: TEEI Platform (Henrik Røine)

---

**Status**: Active Development
**Last Updated**: 2025-11-13