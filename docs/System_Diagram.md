# TEEI CSR Platform - System Diagram

## High-Level System Architecture

```mermaid
graph TB
    subgraph "External Systems"
        Kintell[Kintell Platform]
        Buddy[Buddy Platform]
        LMS[Learning Providers<br/>eCornell, itslearning]
        Discord[Discord Communities]
    end

    subgraph "Frontend Layer"
        Cockpit[Corporate Cockpit<br/>Astro 5 + React]
        Portal[Participant Portal]
    end

    subgraph "API Layer"
        Gateway[API Gateway :3000<br/>JWT, RBAC, Rate Limiting]
    end

    subgraph "Service Layer"
        Profile[Unified Profile :3001<br/>User Journey Aggregation]
        KintellConn[Kintell Connector :3002<br/>CSV Import, Webhooks]
        BuddyService[Buddy Service :3003<br/>Data Ingestion]
        UpskillingConn[Upskilling Connector :3004<br/>Course Tracking]
        Q2Q[Q2Q AI :3005<br/>Qual→Quant Classification]
        Safety[Safety/Moderation :3006<br/>Content Screening]
    end

    subgraph "Event Bus"
        NATS[NATS Event Bus :4222<br/>Pub/Sub, JetStream]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL :5432<br/>Primary Data Store)]
        VectorDB[(pgvector<br/>Embeddings)]
    end

    %% External to Services
    Kintell -->|CSV/Webhooks| KintellConn
    Buddy -->|CSV/API| BuddyService
    LMS -->|CSV/Webhooks| UpskillingConn
    Discord -.->|Future| Profile

    %% Frontend to Gateway
    Cockpit --> Gateway
    Portal --> Gateway

    %% Gateway to Services
    Gateway --> Profile
    Gateway --> KintellConn
    Gateway --> BuddyService
    Gateway --> UpskillingConn
    Gateway --> Q2Q
    Gateway --> Safety

    %% Services to Event Bus
    Profile --> NATS
    KintellConn --> NATS
    BuddyService --> NATS
    UpskillingConn --> NATS
    Q2Q --> NATS
    Safety --> NATS

    %% Services to Database
    Profile --> PG
    KintellConn --> PG
    BuddyService --> PG
    UpskillingConn --> PG
    Q2Q --> PG
    Safety --> PG

    %% Q2Q to Vector DB
    Q2Q --> VectorDB

    %% Event subscriptions (dashed)
    NATS -.->|subscribe| Profile
    NATS -.->|subscribe| Q2Q
    NATS -.->|subscribe| Safety

    style Gateway fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style NATS fill:#E8B339,stroke:#C99729,color:#000
    style PG fill:#336791,stroke:#244564,color:#fff
    style Q2Q fill:#F39C12,stroke:#C87F0A,color:#000
```

## Event Flow: CSV Import to Profile Update

```mermaid
sequenceDiagram
    actor User as Admin User
    participant GW as API Gateway
    participant KC as Kintell Connector
    participant DB as PostgreSQL
    participant NATS as NATS Event Bus
    participant UP as Unified Profile
    participant Q2Q as Q2Q AI

    User->>GW: POST /kintell/import/kintell-sessions<br/>(CSV file)
    GW->>KC: Forward request

    loop For each CSV row
        KC->>KC: Parse & validate row
        KC->>KC: Normalize data<br/>(session type, rating)
        KC->>DB: INSERT kintell_sessions
        DB-->>KC: Session ID
        KC->>NATS: Publish kintell.session.completed
    end

    KC-->>GW: Import results<br/>(processed, created, errors)
    GW-->>User: 200 OK + results

    NATS->>UP: Deliver kintell.session.completed
    UP->>DB: UPDATE program_enrollments<br/>(set status=active)
    UP->>NATS: Publish orchestration.profile.updated

    alt If feedback text present
        NATS->>Q2Q: Deliver kintell.session.completed
        Q2Q->>Q2Q: Classify text<br/>(stub: random scores)
        Q2Q->>DB: INSERT outcome_scores
        Q2Q->>DB: INSERT evidence_snippets
    end
```

## Data Flow: Multi-Program Journey

```mermaid
graph LR
    subgraph "Participant Journey"
        Start[New Participant]
        Buddy[Buddy Match]
        Language[Language Sessions]
        Upskill[Upskilling Courses]
        Mentor[Mentorship]
        Job[Job Ready]
    end

    subgraph "Data Collection"
        BuddyData[Buddy Service<br/>matches, events, feedback]
        KintellData[Kintell Connector<br/>language sessions]
        UpskillingData[Upskilling Connector<br/>course completions]
        MentorData[Kintell Connector<br/>mentorship sessions]
    end

    subgraph "Processing"
        Events[Event Bus<br/>Domain Events]
        Profile[Unified Profile<br/>Journey Flags]
        Q2QEngine[Q2Q AI<br/>Outcome Scores]
    end

    subgraph "Analytics"
        Metrics[Company Metrics<br/>Aggregations]
        Reports[Corporate Reports<br/>SROI, VIS]
    end

    Start --> Buddy --> Language --> Upskill --> Mentor --> Job

    Buddy --> BuddyData
    Language --> KintellData
    Upskill --> UpskillingData
    Mentor --> MentorData

    BuddyData --> Events
    KintellData --> Events
    UpskillingData --> Events
    MentorData --> Events

    Events --> Profile
    Events --> Q2QEngine

    Profile --> Metrics
    Q2QEngine --> Metrics
    Metrics --> Reports

    style Start fill:#3498db,stroke:#2980b9,color:#fff
    style Job fill:#27ae60,stroke:#229954,color:#fff
    style Events fill:#e8b339,stroke:#c99729,color:#000
    style Q2QEngine fill:#f39c12,stroke:#c87f0a,color:#000
```

## Database Schema Overview

```mermaid
erDiagram
    USERS ||--o{ EXTERNAL_ID_MAPPINGS : "has"
    USERS ||--o{ PROGRAM_ENROLLMENTS : "enrolled_in"
    USERS ||--o{ KINTELL_SESSIONS : "participates_in"
    USERS ||--o{ BUDDY_MATCHES : "matched_with"
    USERS ||--o{ LEARNING_PROGRESS : "tracks"

    COMPANIES ||--o{ COMPANY_USERS : "employs"
    COMPANIES ||--o{ METRICS_COMPANY_PERIOD : "measured_by"

    USERS ||--o{ COMPANY_USERS : "works_for"

    BUDDY_MATCHES ||--o{ BUDDY_EVENTS : "has"
    BUDDY_MATCHES ||--o{ BUDDY_CHECKINS : "has"
    BUDDY_MATCHES ||--o{ BUDDY_FEEDBACK : "has"

    OUTCOME_SCORES ||--o{ EVIDENCE_SNIPPETS : "supported_by"

    SAFETY_FLAGS }o--|| USERS : "reviewed_by"

    USERS {
        uuid id PK
        string email UK
        string role
        string first_name
        string last_name
        timestamp created_at
    }

    COMPANIES {
        uuid id PK
        string name
        string industry
        string country
    }

    PROGRAM_ENROLLMENTS {
        uuid id PK
        uuid user_id FK
        string program_type
        string status
        timestamp enrolled_at
        timestamp completed_at
    }

    KINTELL_SESSIONS {
        uuid id PK
        string session_type
        uuid participant_id FK
        uuid volunteer_id FK
        int duration_minutes
        decimal rating
        text feedback_text
    }

    BUDDY_MATCHES {
        uuid id PK
        uuid participant_id FK
        uuid buddy_id FK
        string status
        timestamp matched_at
    }

    LEARNING_PROGRESS {
        uuid id PK
        uuid user_id FK
        string provider
        string course_id
        string status
        int progress_percent
    }

    OUTCOME_SCORES {
        uuid id PK
        uuid text_id
        string dimension
        decimal score
        decimal confidence
    }

    METRICS_COMPANY_PERIOD {
        uuid id PK
        uuid company_id FK
        date period_start
        date period_end
        decimal sroi_ratio
        decimal vis_score
    }
```

## Deployment Architecture (Future)

```mermaid
graph TB
    subgraph "External"
        Users[Users/Clients]
        Admin[Admin Users]
    end

    subgraph "CDN / Load Balancer"
        LB[Load Balancer<br/>ALB/CloudFlare]
    end

    subgraph "Kubernetes Cluster"
        subgraph "Ingress"
            Ingress[NGINX Ingress]
        end

        subgraph "Services Namespace"
            GW1[API Gateway Pod 1]
            GW2[API Gateway Pod 2]
            Prof1[Profile Pod 1]
            Prof2[Profile Pod 2]
            Kint[Kintell Pod]
            Bud[Buddy Pod]
            Upsk[Upskilling Pod]
            Q2QPod[Q2Q AI Pod]
            Safe[Safety Pod]
        end

        subgraph "Event Bus"
            NATS1[NATS Pod 1]
            NATS2[NATS Pod 2]
            NATS3[NATS Pod 3]
        end
    end

    subgraph "Managed Services"
        RDS[(RDS PostgreSQL<br/>Multi-AZ)]
        Redis[(Redis Cache)]
        S3[S3 Bucket<br/>CSV Storage]
    end

    subgraph "Observability"
        Grafana[Grafana<br/>Dashboards]
        Prom[Prometheus<br/>Metrics]
        Loki[Loki<br/>Logs]
    end

    Users --> LB
    Admin --> LB
    LB --> Ingress

    Ingress --> GW1
    Ingress --> GW2

    GW1 --> Prof1
    GW1 --> Prof2
    GW1 --> Kint
    GW1 --> Bud
    GW2 --> Prof1
    GW2 --> Prof2
    GW2 --> Upsk
    GW2 --> Q2QPod

    Prof1 --> RDS
    Prof2 --> RDS
    Kint --> RDS
    Bud --> RDS
    Upsk --> RDS
    Q2QPod --> RDS
    Safe --> RDS

    Prof1 --> Redis
    Prof2 --> Redis

    Kint --> NATS1
    Bud --> NATS2
    Upsk --> NATS3
    Prof1 --> NATS1
    Q2QPod --> NATS2

    NATS1 <--> NATS2
    NATS2 <--> NATS3
    NATS1 <--> NATS3

    GW1 -.->|metrics| Prom
    Prof1 -.->|metrics| Prom
    Kint -.->|logs| Loki
    Prom --> Grafana
    Loki --> Grafana

    style LB fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style RDS fill:#336791,stroke:#244564,color:#fff
    style NATS1 fill:#E8B339,stroke:#C99729,color:#000
    style NATS2 fill:#E8B339,stroke:#C99729,color:#000
    style NATS3 fill:#E8B339,stroke:#C99729,color:#000
```

## Security Flow: Authentication & Authorization

```mermaid
sequenceDiagram
    actor User
    participant GW as API Gateway
    participant Auth as JWT Middleware
    participant RBAC as RBAC Middleware
    participant Service as Target Service
    participant DB as Database

    User->>GW: Request with JWT<br/>Authorization: Bearer <token>
    GW->>Auth: Verify JWT signature

    alt Valid JWT
        Auth->>Auth: Decode payload<br/>(userId, role, email)
        Auth->>RBAC: Check role permissions

        alt Authorized
            RBAC->>Service: Forward request<br/>(with user context)
            Service->>DB: Query/Update data
            DB-->>Service: Data
            Service-->>GW: Response
            GW-->>User: 200 OK + data
        else Unauthorized
            RBAC-->>GW: 403 Forbidden
            GW-->>User: 403 Forbidden
        end
    else Invalid JWT
        Auth-->>GW: 401 Unauthorized
        GW-->>User: 401 Unauthorized
    end
```

## Event Versioning Strategy

```mermaid
graph LR
    subgraph "Event Evolution"
        V1[Event v1<br/>Initial Schema]
        V2[Event v2<br/>Add Optional Fields]
        V3[Event v3<br/>Breaking Changes]
    end

    subgraph "Consumers"
        Old[Old Consumer<br/>Reads v1]
        New[New Consumer<br/>Reads v2]
        Future[Future Consumer<br/>Reads v3]
    end

    V1 -->|compatible| Old
    V2 -->|compatible| Old
    V2 -->|compatible| New
    V3 -->|separate topic| Future

    style V1 fill:#3498db,stroke:#2980b9,color:#fff
    style V2 fill:#2ecc71,stroke:#27ae60,color:#fff
    style V3 fill:#e74c3c,stroke:#c0392b,color:#fff
```

---

**Diagram Format**: Mermaid (render with GitHub, GitLab, or Mermaid Live Editor)
**Last Updated**: 2025-11-13
**Document Owner**: TEEI Platform Team
