/**
 * Test Fixtures for Export Tests
 *
 * Reusable test data for PDF/CSV/JSON export testing
 *
 * @module tests/fixtures/exportTestData
 */

import type { GeneratedReport, TenantConfig } from '../../types.js';
import type { WatermarkConfig } from '../../src/types/approvals.js';
import type { ChartConfig } from '../../src/utils/chartRenderer.js';

/**
 * Sample Tenant Configurations
 */
export const testTenants = {
  acme: {
    id: 'tenant-acme-001',
    name: 'Acme Corporation',
    logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    watermarkText: 'Acme Corporation - Confidential',
    contactEmail: 'contact@acme.com',
    website: 'https://acme.com',
  },
  globex: {
    id: 'tenant-globex-002',
    name: 'Globex Industries',
    logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNkYPhfz8DAwAQABuEB/ZznHJUAAAAASUVORK5CYII=',
    primaryColor: '#10b981',
    secondaryColor: '#f59e0b',
    watermarkText: 'Globex Industries - Internal Use Only',
    contactEmail: 'info@globex.com',
    website: 'https://globex.com',
  },
  initech: {
    id: 'tenant-initech-003',
    name: 'Initech LLC',
    logo: undefined,
    primaryColor: '#ef4444',
    secondaryColor: '#f97316',
    watermarkText: 'Initech LLC - Proprietary',
    contactEmail: 'support@initech.com',
    website: 'https://initech.com',
  },
} as const;

/**
 * Sample Chart Configurations
 */
export const testCharts: Record<string, ChartConfig> = {
  lineChart: {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Volunteer Hours',
          data: [120, 145, 160, 155, 180, 195],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Monthly Volunteer Hours',
        },
      },
    },
  },

  barChart: {
    type: 'bar',
    data: {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Impact Score',
          data: [68, 75, 82, 88],
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Quarterly Impact Scores',
        },
      },
    },
  },

  pieChart: {
    type: 'pie',
    data: {
      labels: ['Integration', 'Language', 'Job Readiness', 'Community'],
      datasets: [
        {
          label: 'Outcome Distribution',
          data: [30, 25, 25, 20],
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Outcome Distribution',
        },
        legend: {
          display: true,
          position: 'bottom',
        },
      },
    },
  },

  doughnutChart: {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'In Progress', 'Pending'],
      datasets: [
        {
          label: 'Project Status',
          data: [45, 35, 20],
          backgroundColor: ['#10b981', '#f59e0b', '#6b7280'],
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Project Status',
        },
      },
    },
  },

  radarChart: {
    type: 'radar',
    data: {
      labels: ['Communication', 'Technical', 'Leadership', 'Teamwork', 'Problem Solving'],
      datasets: [
        {
          label: 'Skills Assessment',
          data: [85, 75, 80, 90, 88],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3b82f6',
          pointRadius: 4,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Skills Assessment Radar',
        },
      },
    },
  },

  areaChart: {
    type: 'area',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        {
          label: 'Volunteer Hours',
          data: [120, 145, 160, 180],
          backgroundColor: 'rgba(16, 185, 129, 0.3)',
          borderColor: '#10b981',
          fill: true,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Weekly Volunteer Hours Trend',
        },
      },
    },
  },
};

/**
 * Sample Watermark Configurations
 */
export const testWatermarks: Record<string, WatermarkConfig> = {
  standard: {
    enabled: true,
    text: 'CONFIDENTIAL',
    position: 'footer',
    opacity: 0.3,
    font_size: 10,
    color: '#666666',
    include_timestamp: true,
    include_approver_name: false,
    include_company_logo: false,
  },

  withLogo: {
    enabled: true,
    text: 'CONFIDENTIAL',
    position: 'footer',
    opacity: 0.4,
    font_size: 12,
    color: '#333333',
    include_timestamp: true,
    include_approver_name: true,
    include_company_logo: true,
  },

  diagonal: {
    enabled: true,
    text: 'INTERNAL USE ONLY',
    position: 'diagonal',
    opacity: 0.15,
    font_size: 48,
    color: '#999999',
    include_timestamp: false,
    include_approver_name: false,
    include_company_logo: false,
  },

  header: {
    enabled: true,
    text: 'DRAFT - NOT FOR DISTRIBUTION',
    position: 'header',
    opacity: 0.5,
    font_size: 14,
    color: '#dc2626',
    include_timestamp: true,
    include_approver_name: false,
    include_company_logo: false,
  },

  disabled: {
    enabled: false,
    text: '',
    position: 'footer',
    opacity: 0,
    font_size: 10,
    color: '#000000',
    include_timestamp: false,
    include_approver_name: false,
    include_company_logo: false,
  },
};

/**
 * Sample Report Generator
 */
export function createTestReport(
  tenantKey: keyof typeof testTenants,
  options?: {
    reportId?: string;
    includeCharts?: boolean;
    chartCount?: number;
    sectionCount?: number;
  }
): GeneratedReport {
  const tenant = testTenants[tenantKey];
  const charts = Object.values(testCharts);

  const sections = [];
  const sectionCount = options?.sectionCount || 3;

  for (let i = 0; i < sectionCount; i++) {
    const sectionCharts = options?.includeCharts !== false && i < charts.length
      ? [charts[i % charts.length]]
      : [];

    sections.push({
      order: i + 1,
      title: `Section ${i + 1}`,
      narrative: `This is the narrative for section ${i + 1}. It contains detailed information about the impact and outcomes.`,
      charts: sectionCharts,
      citations: [
        {
          evidenceId: `evidence-${i + 1}`,
          snippet: `Evidence snippet for section ${i + 1}`,
          sourceType: 'survey',
          dateCollected: new Date(),
          confidence: 0.9 + Math.random() * 0.1,
        },
      ],
    });
  }

  return {
    id: options?.reportId || `report-${tenant.id}-${Date.now()}`,
    reportType: 'quarterly',
    period: {
      from: new Date('2024-10-01'),
      to: new Date('2024-12-31'),
    },
    metadata: {
      companyName: tenant.name,
      companyId: tenant.id,
      generatedAt: new Date(),
      generatedBy: 'test-user@example.com',
      reportTitle: 'Q4 2024 Impact Report',
    },
    sections,
  };
}

/**
 * Sample CSV Data
 */
export const sampleCSVData = {
  headers: ['Company Name', 'Industry', 'Total Volunteers', 'Total Hours', 'Avg Integration', 'Avg Language', 'Avg Job Readiness'],
  rows: [
    ['Acme Corporation', 'Technology', '150', '3250.50', '75.5', '82.3', '88.1'],
    ['Globex Industries', 'Manufacturing', '120', '2890.00', '78.2', '80.5', '85.7'],
    ['Initech LLC', 'Consulting', '95', '2100.75', '72.8', '79.1', '83.4'],
  ],
};

/**
 * Sample JSON Data
 */
export const sampleJSONData = {
  period: '2024-Q4',
  data: [
    {
      company_name: 'Acme Corporation',
      industry: 'Technology',
      total_volunteers: 150,
      total_hours: 3250.5,
      outcomes: {
        integration: '75.5',
        language: '82.3',
        job_readiness: '88.1',
      },
    },
    {
      company_name: 'Globex Industries',
      industry: 'Manufacturing',
      total_volunteers: 120,
      total_hours: 2890.0,
      outcomes: {
        integration: '78.2',
        language: '80.5',
        job_readiness: '85.7',
      },
    },
    {
      company_name: 'Initech LLC',
      industry: 'Consulting',
      total_volunteers: 95,
      total_hours: 2100.75,
      outcomes: {
        integration: '72.8',
        language: '79.1',
        job_readiness: '83.4',
      },
    },
  ],
};

/**
 * Sample User Data for Audit Tests
 */
export const testUsers = [
  {
    id: 'user-001',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    ipAddress: '192.168.1.100',
  },
  {
    id: 'user-002',
    name: 'John Smith',
    email: 'john.smith@example.com',
    ipAddress: '192.168.1.101',
  },
  {
    id: 'user-003',
    name: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    ipAddress: '192.168.1.102',
  },
  {
    id: 'user-004',
    name: 'Bob Wilson',
    email: 'bob.wilson@example.com',
    ipAddress: '192.168.1.103',
  },
];

/**
 * Performance Test Constants
 */
export const performanceThresholds = {
  singlePDFExport: 30000, // 30 seconds
  batchPDFExport: 60000, // 60 seconds
  chartRender: 5000, // 5 seconds
  chartRenderCached: 500, // 500ms
  csvExport: 2000, // 2 seconds
  jsonExport: 1000, // 1 second
  auditLogQuery: 100, // 100ms
};

/**
 * Test Data Sizes
 */
export const testDataSizes = {
  small: {
    sectionCount: 3,
    chartCount: 2,
    expectedPages: 5,
    expectedSizeKB: 500,
  },
  medium: {
    sectionCount: 8,
    chartCount: 6,
    expectedPages: 15,
    expectedSizeKB: 1500,
  },
  large: {
    sectionCount: 20,
    chartCount: 15,
    expectedPages: 40,
    expectedSizeKB: 4000,
  },
};

/**
 * Helper: Create test logo buffer
 */
export function createTestLogoBuffer(): Buffer {
  // 1x1 transparent PNG
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(base64, 'base64');
}

/**
 * Helper: Create test user session
 */
export function createTestUserSession(userIndex: number = 0) {
  const user = testUsers[userIndex % testUsers.length];
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      companyId: testTenants.acme.id,
    },
    ip: user.ipAddress,
    userAgent: 'Mozilla/5.0 (Test Browser)',
  };
}

/**
 * Helper: Generate random report data
 */
export function generateRandomMetrics() {
  return {
    volunteers: Math.floor(Math.random() * 200) + 50,
    hours: Math.floor(Math.random() * 5000) + 1000,
    integration: (Math.random() * 30 + 70).toFixed(1),
    language: (Math.random() * 30 + 70).toFixed(1),
    jobReadiness: (Math.random() * 30 + 70).toFixed(1),
  };
}
