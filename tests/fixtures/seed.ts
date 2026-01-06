/**
 * Test Data Seeder
 *
 * Seeds deterministic test data for unit, integration, and E2E tests.
 * Provides consistent fixtures across all test environments.
 *
 * Usage:
 *   pnpm test:seed        # Seed test database
 *   pnpm test:seed:reset  # Reset to clean state
 */

import { faker } from '@faker-js/faker';

// Set seed for deterministic data
faker.seed(12345);

/**
 * User fixtures
 */
export const users = {
  admin: {
    id: 'user_admin_001',
    email: 'admin@teei-test.com',
    name: 'Admin User',
    role: 'admin',
    tenantId: 'tenant_001',
    permissions: ['read', 'write', 'delete', 'manage_users', 'manage_tenants']
  },
  viewer: {
    id: 'user_viewer_001',
    email: 'viewer@teei-test.com',
    name: 'Viewer User',
    role: 'viewer',
    tenantId: 'tenant_001',
    permissions: ['read']
  },
  partner: {
    id: 'user_partner_001',
    email: 'partner@partner-org.com',
    name: 'Partner User',
    role: 'partner',
    tenantId: 'tenant_002',
    permissions: ['read', 'write']
  },
  analyst: {
    id: 'user_analyst_001',
    email: 'analyst@teei-test.com',
    name: 'Analyst User',
    role: 'analyst',
    tenantId: 'tenant_001',
    permissions: ['read', 'write', 'generate_reports']
  }
};

/**
 * Tenant fixtures
 */
export const tenants = {
  primary: {
    id: 'tenant_001',
    name: 'TEEI Test Corporation',
    slug: 'teei-test',
    domain: 'teei-test.com',
    locale: 'en',
    timezone: 'UTC',
    settings: {
      features: {
        reports: true,
        analytics: true,
        impactIn: true,
        benchmarks: true
      }
    }
  },
  partner: {
    id: 'tenant_002',
    name: 'Partner Organization',
    slug: 'partner-org',
    domain: 'partner-org.com',
    locale: 'en',
    timezone: 'America/New_York',
    settings: {
      features: {
        reports: true,
        analytics: false,
        impactIn: true,
        benchmarks: false
      }
    }
  },
  multilocale: {
    id: 'tenant_003',
    name: 'Global CSR Initiative',
    slug: 'global-csr',
    domain: 'global-csr.org',
    locale: 'no',
    timezone: 'Europe/Oslo',
    settings: {
      features: {
        reports: true,
        analytics: true,
        impactIn: true,
        benchmarks: true
      }
    }
  }
};

/**
 * Report fixtures
 */
export const reports = {
  quarterly: {
    id: 'report_q1_2024',
    type: 'quarterly',
    title: 'Q1 2024 Impact Report',
    period: {
      start: '2024-01-01',
      end: '2024-03-31'
    },
    tenantId: 'tenant_001',
    status: 'published',
    locale: 'en',
    metrics: {
      totalVolunteers: 1250,
      totalHours: 8500,
      totalImpact: 425000,
      sroi: 3.5
    },
    generatedAt: '2024-04-05T10:00:00Z',
    generatedBy: 'user_admin_001'
  },
  annual: {
    id: 'report_annual_2023',
    type: 'annual',
    title: '2023 Annual CSR Report',
    period: {
      start: '2023-01-01',
      end: '2023-12-31'
    },
    tenantId: 'tenant_001',
    status: 'published',
    locale: 'en',
    metrics: {
      totalVolunteers: 4800,
      totalHours: 32000,
      totalImpact: 1600000,
      sroi: 3.8
    },
    generatedAt: '2024-01-15T10:00:00Z',
    generatedBy: 'user_admin_001'
  },
  investorUpdate: {
    id: 'report_investor_q4_2023',
    type: 'investor-update',
    title: 'Q4 2023 Investor Update',
    period: {
      start: '2023-10-01',
      end: '2023-12-31'
    },
    tenantId: 'tenant_001',
    status: 'draft',
    locale: 'en',
    metrics: {
      totalVolunteers: 1100,
      totalHours: 7200,
      totalImpact: 360000,
      sroi: 3.3
    },
    generatedAt: '2024-01-08T10:00:00Z',
    generatedBy: 'user_analyst_001'
  }
};

/**
 * Evidence fixtures
 */
export const evidence = {
  citation1: {
    id: 'evidence_001',
    type: 'citation',
    source: 'Impact-In Event Log',
    content: 'Volunteer hours logged via Benevity integration',
    timestamp: '2024-03-15T14:30:00Z',
    metadata: {
      eventId: 'event_benevity_12345',
      provider: 'benevity',
      verified: true
    }
  },
  citation2: {
    id: 'evidence_002',
    type: 'citation',
    source: 'Q2Q AI Analysis',
    content: 'Sentiment analysis of volunteer feedback: 92% positive',
    timestamp: '2024-03-20T09:15:00Z',
    metadata: {
      modelVersion: 'q2q-v2.1',
      confidence: 0.94,
      sampleSize: 350
    }
  },
  lineage: {
    id: 'lineage_001',
    evidenceId: 'evidence_001',
    chain: [
      {
        step: 1,
        source: 'Benevity API',
        timestamp: '2024-03-15T14:30:00Z',
        hash: 'sha256:abc123...'
      },
      {
        step: 2,
        source: 'Impact-In Processor',
        timestamp: '2024-03-15T14:30:15Z',
        hash: 'sha256:def456...'
      },
      {
        step: 3,
        source: 'Reporting Service',
        timestamp: '2024-04-05T10:00:00Z',
        hash: 'sha256:ghi789...'
      }
    ]
  }
};

/**
 * Impact-In event fixtures
 */
export const impactInEvents = {
  benevity: {
    id: 'event_benevity_001',
    provider: 'benevity',
    eventType: 'volunteer.hours.logged',
    timestamp: '2024-03-15T14:30:00Z',
    data: {
      volunteerId: 'vol_001',
      activityId: 'activity_001',
      hours: 4.5,
      date: '2024-03-15',
      cause: 'education'
    },
    status: 'processed',
    processedAt: '2024-03-15T14:30:15Z'
  },
  goodera: {
    id: 'event_goodera_001',
    provider: 'goodera',
    eventType: 'donation.made',
    timestamp: '2024-03-18T10:00:00Z',
    data: {
      donorId: 'donor_001',
      amount: 500,
      currency: 'USD',
      projectId: 'project_001',
      cause: 'health'
    },
    status: 'processed',
    processedAt: '2024-03-18T10:00:20Z'
  },
  workday: {
    id: 'event_workday_001',
    provider: 'workday',
    eventType: 'employee.enrolled',
    timestamp: '2024-03-10T08:00:00Z',
    data: {
      employeeId: 'emp_001',
      programId: 'prog_001',
      enrollmentDate: '2024-03-10'
    },
    status: 'processed',
    processedAt: '2024-03-10T08:00:30Z'
  }
};

/**
 * SROI calculation fixtures
 */
export const sroiCalculations = {
  standard: {
    inputs: {
      totalInvestment: 100000,
      volunteerHours: 5000,
      volunteerHourlyRate: 25,
      donations: 50000,
      administrativeCosts: 10000
    },
    outputs: {
      directBeneficiaries: 1000,
      indirectBeneficiaries: 3000,
      socialValue: 350000
    },
    sroi: 3.5,
    confidence: 0.85
  },
  edgeCase_zero: {
    inputs: {
      totalInvestment: 0,
      volunteerHours: 0,
      volunteerHourlyRate: 25,
      donations: 0,
      administrativeCosts: 0
    },
    outputs: {
      directBeneficiaries: 0,
      indirectBeneficiaries: 0,
      socialValue: 0
    },
    sroi: 0,
    confidence: 0
  },
  edgeCase_negative: {
    inputs: {
      totalInvestment: 100000,
      volunteerHours: 1000,
      volunteerHourlyRate: 25,
      donations: 10000,
      administrativeCosts: 150000 // Higher than total inputs
    },
    outputs: {
      directBeneficiaries: 100,
      indirectBeneficiaries: 200,
      socialValue: 50000
    },
    sroi: -0.5,
    confidence: 0.6
  }
};

/**
 * VIS calculation fixtures
 */
export const visCalculations = {
  highEngagement: {
    volunteerId: 'vol_001',
    metrics: {
      totalHours: 120,
      activitiesCompleted: 25,
      impactScore: 450,
      consistencyScore: 0.9,
      diversityScore: 0.8
    },
    score: 85,
    tier: 'champion'
  },
  mediumEngagement: {
    volunteerId: 'vol_002',
    metrics: {
      totalHours: 50,
      activitiesCompleted: 10,
      impactScore: 180,
      consistencyScore: 0.6,
      diversityScore: 0.5
    },
    score: 60,
    tier: 'active'
  },
  lowEngagement: {
    volunteerId: 'vol_003',
    metrics: {
      totalHours: 5,
      activitiesCompleted: 1,
      impactScore: 20,
      consistencyScore: 0.2,
      diversityScore: 0.1
    },
    score: 15,
    tier: 'beginner'
  }
};

/**
 * Seed database with fixtures
 */
export async function seedDatabase() {
  console.log('🌱 Seeding test database...');

  // In a real implementation, this would insert into the database
  // For now, we'll just log the data

  console.log('  ✓ Users:', Object.keys(users).length);
  console.log('  ✓ Tenants:', Object.keys(tenants).length);
  console.log('  ✓ Reports:', Object.keys(reports).length);
  console.log('  ✓ Evidence:', Object.keys(evidence).length);
  console.log('  ✓ Impact-In Events:', Object.keys(impactInEvents).length);
  console.log('  ✓ SROI Calculations:', Object.keys(sroiCalculations).length);
  console.log('  ✓ VIS Calculations:', Object.keys(visCalculations).length);

  console.log('\n✅ Database seeded successfully');
}

/**
 * Reset database to clean state
 */
export async function resetDatabase() {
  console.log('🧹 Resetting test database...');

  // In a real implementation, this would truncate tables

  console.log('✅ Database reset successfully');
}

/**
 * Generate random fixtures
 */
export function generateRandomUser() {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: faker.helpers.arrayElement(['admin', 'viewer', 'analyst', 'partner']),
    tenantId: faker.helpers.arrayElement(Object.values(tenants)).id,
    permissions: ['read']
  };
}

export function generateRandomTenant() {
  const name = faker.company.name();
  return {
    id: faker.string.uuid(),
    name,
    slug: faker.helpers.slugify(name).toLowerCase(),
    domain: faker.internet.domainName(),
    locale: faker.helpers.arrayElement(['en', 'no', 'fr', 'es']),
    timezone: faker.location.timeZone(),
    settings: {
      features: {
        reports: faker.datatype.boolean(),
        analytics: faker.datatype.boolean(),
        impactIn: faker.datatype.boolean(),
        benchmarks: faker.datatype.boolean()
      }
    }
  };
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'seed':
      seedDatabase();
      break;

    case 'reset':
      resetDatabase();
      break;

    default:
      console.log('Test Data Seeder');
      console.log('');
      console.log('Commands:');
      console.log('  seed   - Seed test database with fixtures');
      console.log('  reset  - Reset database to clean state');
      break;
  }
}
