import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc } from 'drizzle-orm';
import { impactDeliveries } from '@teei/shared-schema';
import { createHash } from 'crypto';

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/teei';
const queryClient = postgres(connectionString);
const db = drizzle(queryClient);

export type Platform = 'benevity' | 'goodera' | 'workday';
export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying';

export interface DeliveryRecord {
  id: string;
  companyId: string;
  platform: Platform;
  payloadHash: string;
  payloadSample: any;
  status: DeliveryStatus;
  retries: number;
  errorMsg: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
}

export interface LogDeliveryParams {
  companyId: string;
  platform: Platform;
  payload: any;
  status: DeliveryStatus;
  errorMsg?: string;
  retries?: number;
}

export interface UpdateDeliveryParams {
  deliveryId: string;
  status: DeliveryStatus;
  errorMsg?: string;
  retries?: number;
}

/**
 * Generate SHA-256 hash of payload for deduplication
 */
export function generatePayloadHash(payload: any): string {
  const payloadString = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(payloadString).digest('hex');
}

/**
 * Create a sample of the payload (first 1000 chars of JSON)
 */
export function createPayloadSample(payload: any): any {
  const payloadString = JSON.stringify(payload);
  if (payloadString.length <= 1000) {
    return payload;
  }
  // Return truncated version
  return {
    _truncated: true,
    _originalLength: payloadString.length,
    sample: JSON.parse(payloadString.substring(0, 1000) + '}'),
  };
}

/**
 * Log a delivery attempt
 */
export async function logDelivery(params: LogDeliveryParams): Promise<string> {
  const payloadHash = generatePayloadHash(params.payload);
  const payloadSample = createPayloadSample(params.payload);

  const [result] = await db
    .insert(impactDeliveries)
    .values({
      companyId: params.companyId,
      platform: params.platform,
      payloadHash,
      payloadSample,
      status: params.status,
      retries: params.retries || 0,
      errorMsg: params.errorMsg || null,
      deliveredAt: params.status === 'delivered' ? new Date() : null,
    })
    .returning({ id: impactDeliveries.id });

  return result.id;
}

/**
 * Update delivery status
 */
export async function updateDeliveryStatus(params: UpdateDeliveryParams): Promise<void> {
  await db
    .update(impactDeliveries)
    .set({
      status: params.status,
      errorMsg: params.errorMsg || null,
      retries: params.retries,
      deliveredAt: params.status === 'delivered' ? new Date() : null,
    })
    .where(eq(impactDeliveries.id, params.deliveryId));
}

/**
 * Fetch delivery history for a company
 */
export async function getDeliveryHistory(
  companyId: string,
  platform?: Platform,
  limit: number = 100
): Promise<DeliveryRecord[]> {
  const conditions = platform
    ? and(eq(impactDeliveries.companyId, companyId), eq(impactDeliveries.platform, platform))
    : eq(impactDeliveries.companyId, companyId);

  const results = await db
    .select()
    .from(impactDeliveries)
    .where(conditions)
    .orderBy(desc(impactDeliveries.createdAt))
    .limit(limit);

  return results as DeliveryRecord[];
}

/**
 * Get a single delivery record by ID
 */
export async function getDeliveryById(deliveryId: string): Promise<DeliveryRecord | null> {
  const [result] = await db
    .select()
    .from(impactDeliveries)
    .where(eq(impactDeliveries.id, deliveryId))
    .limit(1);

  return result as DeliveryRecord | null;
}

/**
 * Get failed deliveries for retry
 */
export async function getFailedDeliveries(
  companyId?: string,
  maxRetries: number = 3
): Promise<DeliveryRecord[]> {
  let query = db
    .select()
    .from(impactDeliveries)
    .where(eq(impactDeliveries.status, 'failed'))
    .orderBy(desc(impactDeliveries.createdAt));

  if (companyId) {
    query = db
      .select()
      .from(impactDeliveries)
      .where(
        and(
          eq(impactDeliveries.companyId, companyId),
          eq(impactDeliveries.status, 'failed')
        )
      )
      .orderBy(desc(impactDeliveries.createdAt));
  }

  const results = await query;

  // Filter by max retries
  return (results as DeliveryRecord[]).filter((r) => r.retries < maxRetries);
}

/**
 * Check if a payload has already been delivered (by hash)
 */
export async function isPayloadDelivered(
  companyId: string,
  platform: Platform,
  payloadHash: string
): Promise<boolean> {
  const [result] = await db
    .select()
    .from(impactDeliveries)
    .where(
      and(
        eq(impactDeliveries.companyId, companyId),
        eq(impactDeliveries.platform, platform),
        eq(impactDeliveries.payloadHash, payloadHash),
        eq(impactDeliveries.status, 'delivered')
      )
    )
    .limit(1);

  return !!result;
}
