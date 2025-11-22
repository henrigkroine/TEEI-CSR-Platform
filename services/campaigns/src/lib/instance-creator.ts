/**
 * Program Instance Creator
 *
 * Auto-creates initial ProgramInstance when a campaign is activated
 */

import { pool } from '../db/connection.js';
import type { Campaign, ProgramTemplateConfig } from '@teei/shared-schema';
import { mergeConfigs } from './config-merger.js';

/**
 * Program Instance creation input
 */
export interface CreateInstanceInput {
  campaignId: string;
  name?: string; // Optional, will auto-generate if not provided
  startDate?: string; // Optional, defaults to campaign start date
  endDate?: string; // Optional, defaults to campaign end date
  config?: ProgramTemplateConfig; // Optional, will merge if not provided
}

/**
 * Program Instance creation result
 */
export interface ProgramInstance {
  id: string;
  name: string;
  campaignId: string;
  programTemplateId: string;
  companyId: string;
  beneficiaryGroupId: string;
  startDate: string;
  endDate: string;
  status: string;
  config: ProgramTemplateConfig;
  enrolledVolunteers: number;
  enrolledBeneficiaries: number;
  totalSessionsHeld: number;
  totalHoursLogged: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Auto-create initial ProgramInstance for a campaign
 *
 * This is called when a campaign transitions to 'active' status
 *
 * @param campaignId - Campaign ID
 * @param options - Optional customization
 * @returns Created ProgramInstance
 */
export async function createInitialInstance(
  campaignId: string,
  options: Partial<CreateInstanceInput> = {}
): Promise<ProgramInstance> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch campaign with related data
    const campaignResult = await client.query<Campaign>(
      `SELECT c.*,
              pt.default_config as template_config,
              pt.program_type
       FROM campaigns c
       JOIN program_templates pt ON c.program_template_id = pt.id
       WHERE c.id = $1`,
      [campaignId]
    );

    if (campaignResult.rows.length === 0) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const campaign = campaignResult.rows[0]!;

    // 2. Generate instance name if not provided
    const instanceName = options.name || `${campaign.name} - Cohort 1`;

    // 3. Merge config if not provided
    let instanceConfig: ProgramTemplateConfig;
    if (options.config) {
      instanceConfig = options.config;
    } else {
      const templateConfig = campaign.template_config as unknown as ProgramTemplateConfig;
      const campaignOverrides = (campaign.configOverrides as Record<string, any>) || {};
      const { merged } = mergeConfigs(templateConfig, campaignOverrides);
      instanceConfig = merged;
    }

    // 4. Set dates (default to campaign dates)
    const startDate = options.startDate || campaign.startDate;
    const endDate = options.endDate || campaign.endDate;

    // 5. Insert program instance
    const insertResult = await client.query<ProgramInstance>(
      `INSERT INTO program_instances (
        name,
        campaign_id,
        program_template_id,
        company_id,
        beneficiary_group_id,
        start_date,
        end_date,
        status,
        config,
        enrolled_volunteers,
        enrolled_beneficiaries,
        total_sessions_held,
        total_hours_logged
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        instanceName,
        campaign.id,
        campaign.programTemplateId,
        campaign.companyId,
        campaign.beneficiaryGroupId,
        startDate,
        endDate,
        'planned', // Initial status
        JSON.stringify(instanceConfig),
        0, // enrolledVolunteers
        0, // enrolledBeneficiaries
        0, // totalSessionsHeld
        '0.00', // totalHoursLogged
      ]
    );

    await client.query('COMMIT');

    return insertResult.rows[0]!;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if a campaign already has instances
 */
export async function hasExistingInstances(campaignId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count FROM program_instances WHERE campaign_id = $1`,
      [campaignId]
    );
    return parseInt(result.rows[0]?.count || '0') > 0;
  } finally {
    client.release();
  }
}

/**
 * Get all instances for a campaign
 */
export async function getInstancesByCampaign(
  campaignId: string
): Promise<ProgramInstance[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<ProgramInstance>(
      `SELECT * FROM program_instances WHERE campaign_id = $1 ORDER BY created_at DESC`,
      [campaignId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}
