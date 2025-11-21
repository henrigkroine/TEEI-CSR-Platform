import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@teei/shared-schema/db';
import {
  publications,
  publicationBlocks,
  publicationAnalytics,
} from '@teei/shared-schema';
import type {
  Publication,
  PublicationWithBlocks,
  PublicationBlock,
  CreatePublicationRequest,
  UpdatePublicationRequest,
  AddBlockRequest,
  UpdateBlockRequest,
  PublishPublicationRequest,
  RotateTokenRequest,
  RotateTokenResponse,
  PublicationStats,
  PublicPublicationResponse,
} from '@teei/shared-types';
import { createHash, randomBytes } from 'crypto';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Publication service for managing public impact pages
 */
export class PublicationService {
  /**
   * Create a new publication
   */
  async createPublication(
    tenantId: string,
    data: CreatePublicationRequest
  ): Promise<Publication> {
    // Validate slug uniqueness for this tenant
    const existing = await db
      .select()
      .from(publications)
      .where(and(eq(publications.tenantId, tenantId), eq(publications.slug, data.slug)))
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`Publication with slug "${data.slug}" already exists for this tenant`);
    }

    const [publication] = await db
      .insert(publications)
      .values({
        tenantId,
        slug: data.slug,
        title: data.title,
        description: data.description,
        visibility: data.visibility || 'PUBLIC',
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        ogImage: data.ogImage,
        status: 'DRAFT',
        etag: this.generateETag(),
      })
      .returning();

    return publication as Publication;
  }

  /**
   * Get publication by ID
   */
  async getPublicationById(
    publicationId: string,
    tenantId: string
  ): Promise<PublicationWithBlocks | null> {
    const [publication] = await db
      .select()
      .from(publications)
      .where(
        and(eq(publications.id, publicationId), eq(publications.tenantId, tenantId))
      )
      .limit(1);

    if (!publication) {
      return null;
    }

    const blocks = await db
      .select()
      .from(publicationBlocks)
      .where(eq(publicationBlocks.publicationId, publicationId))
      .orderBy(publicationBlocks.order);

    return {
      ...publication,
      blocks: blocks as PublicationBlock[],
    } as PublicationWithBlocks;
  }

  /**
   * Get publication by slug (public access)
   */
  async getPublicationBySlug(
    slug: string,
    accessToken?: string
  ): Promise<PublicPublicationResponse | null> {
    const [publication] = await db
      .select()
      .from(publications)
      .where(and(eq(publications.slug, slug), eq(publications.status, 'LIVE')))
      .limit(1);

    if (!publication) {
      return null;
    }

    // Check token access if required
    if (publication.visibility === 'TOKEN') {
      if (!accessToken || accessToken !== publication.accessToken) {
        throw new Error('Invalid or missing access token');
      }

      // Check token expiration
      if (publication.tokenExpiresAt && new Date(publication.tokenExpiresAt) < new Date()) {
        throw new Error('Access token has expired');
      }
    }

    const blocks = await db
      .select()
      .from(publicationBlocks)
      .where(eq(publicationBlocks.publicationId, publication.id))
      .orderBy(publicationBlocks.order);

    // Sanitize text blocks for XSS protection
    const sanitizedBlocks = blocks.map((block) => {
      if (block.kind === 'TEXT') {
        const payload = block.payloadJson as any;
        return {
          ...block,
          payloadJson: {
            ...payload,
            content: DOMPurify.sanitize(payload.content, {
              ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote'],
              ALLOWED_ATTR: ['href', 'target', 'rel'],
            }),
          },
        };
      }
      return block;
    });

    return {
      id: publication.id,
      tenantId: publication.tenantId,
      slug: publication.slug,
      title: publication.title,
      description: publication.description ?? undefined,
      metaTitle: publication.metaTitle ?? undefined,
      metaDescription: publication.metaDescription ?? undefined,
      ogImage: publication.ogImage ?? undefined,
      publishedAt: publication.publishedAt?.toISOString(),
      blocks: sanitizedBlocks as PublicationBlock[],
      etag: publication.etag ?? undefined,
    };
  }

  /**
   * List all publications for a tenant
   */
  async listPublications(tenantId: string): Promise<Publication[]> {
    const result = await db
      .select()
      .from(publications)
      .where(eq(publications.tenantId, tenantId))
      .orderBy(desc(publications.updatedAt));

    return result as Publication[];
  }

  /**
   * Update publication
   */
  async updatePublication(
    publicationId: string,
    tenantId: string,
    data: UpdatePublicationRequest
  ): Promise<Publication> {
    // Validate slug uniqueness if changing slug
    if (data.slug) {
      const existing = await db
        .select()
        .from(publications)
        .where(
          and(
            eq(publications.tenantId, tenantId),
            eq(publications.slug, data.slug),
            sql`${publications.id} != ${publicationId}`
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error(`Publication with slug "${data.slug}" already exists for this tenant`);
      }
    }

    const [updated] = await db
      .update(publications)
      .set({
        ...data,
        updatedAt: new Date(),
        etag: this.generateETag(),
      })
      .where(
        and(eq(publications.id, publicationId), eq(publications.tenantId, tenantId))
      )
      .returning();

    if (!updated) {
      throw new Error('Publication not found');
    }

    return updated as Publication;
  }

  /**
   * Delete publication
   */
  async deletePublication(publicationId: string, tenantId: string): Promise<void> {
    await db
      .delete(publications)
      .where(
        and(eq(publications.id, publicationId), eq(publications.tenantId, tenantId))
      );
  }

  /**
   * Publish a publication (set status to LIVE)
   */
  async publishPublication(
    publicationId: string,
    tenantId: string,
    data?: PublishPublicationRequest
  ): Promise<Publication> {
    const [updated] = await db
      .update(publications)
      .set({
        status: 'LIVE',
        publishedAt: new Date(),
        metaTitle: data?.metaTitle,
        metaDescription: data?.metaDescription,
        ogImage: data?.ogImage,
        updatedAt: new Date(),
        etag: this.generateETag(),
      })
      .where(
        and(eq(publications.id, publicationId), eq(publications.tenantId, tenantId))
      )
      .returning();

    if (!updated) {
      throw new Error('Publication not found');
    }

    return updated as Publication;
  }

  /**
   * Rotate access token for TOKEN-visibility publications
   */
  async rotateToken(
    publicationId: string,
    tenantId: string,
    data?: RotateTokenRequest
  ): Promise<RotateTokenResponse> {
    const [publication] = await db
      .select()
      .from(publications)
      .where(
        and(eq(publications.id, publicationId), eq(publications.tenantId, tenantId))
      )
      .limit(1);

    if (!publication) {
      throw new Error('Publication not found');
    }

    if (publication.visibility !== 'TOKEN') {
      throw new Error('Token rotation is only available for TOKEN-visibility publications');
    }

    const newToken = this.generateToken();
    const expiresInDays = data?.expiresInDays || 30;
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + expiresInDays);

    await db
      .update(publications)
      .set({
        accessToken: newToken,
        tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(publications.id, publicationId));

    const embedUrl = `${process.env.TRUST_CENTER_URL || 'https://trust.teei.io'}/impact/${publication.slug}?token=${newToken}`;

    return {
      accessToken: newToken,
      tokenExpiresAt: tokenExpiresAt.toISOString(),
      embedUrl,
    };
  }

  /**
   * Add a block to a publication
   */
  async addBlock(
    publicationId: string,
    tenantId: string,
    data: AddBlockRequest
  ): Promise<PublicationBlock> {
    // Verify publication ownership
    const [publication] = await db
      .select()
      .from(publications)
      .where(
        and(eq(publications.id, publicationId), eq(publications.tenantId, tenantId))
      )
      .limit(1);

    if (!publication) {
      throw new Error('Publication not found');
    }

    const [block] = await db
      .insert(publicationBlocks)
      .values({
        publicationId,
        kind: data.kind,
        payloadJson: data.payloadJson,
        order: data.order,
      })
      .returning();

    // Update publication etag
    await db
      .update(publications)
      .set({
        updatedAt: new Date(),
        etag: this.generateETag(),
      })
      .where(eq(publications.id, publicationId));

    return block as PublicationBlock;
  }

  /**
   * Update a block
   */
  async updateBlock(
    blockId: string,
    publicationId: string,
    tenantId: string,
    data: UpdateBlockRequest
  ): Promise<PublicationBlock> {
    // Verify publication ownership
    const [publication] = await db
      .select()
      .from(publications)
      .where(
        and(eq(publications.id, publicationId), eq(publications.tenantId, tenantId))
      )
      .limit(1);

    if (!publication) {
      throw new Error('Publication not found');
    }

    const [updated] = await db
      .update(publicationBlocks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(eq(publicationBlocks.id, blockId), eq(publicationBlocks.publicationId, publicationId))
      )
      .returning();

    if (!updated) {
      throw new Error('Block not found');
    }

    // Update publication etag
    await db
      .update(publications)
      .set({
        updatedAt: new Date(),
        etag: this.generateETag(),
      })
      .where(eq(publications.id, publicationId));

    return updated as PublicationBlock;
  }

  /**
   * Delete a block
   */
  async deleteBlock(
    blockId: string,
    publicationId: string,
    tenantId: string
  ): Promise<void> {
    // Verify publication ownership
    const [publication] = await db
      .select()
      .from(publications)
      .where(
        and(eq(publications.id, publicationId), eq(publications.tenantId, tenantId))
      )
      .limit(1);

    if (!publication) {
      throw new Error('Publication not found');
    }

    await db
      .delete(publicationBlocks)
      .where(
        and(eq(publicationBlocks.id, blockId), eq(publicationBlocks.publicationId, publicationId))
      );

    // Update publication etag
    await db
      .update(publications)
      .set({
        updatedAt: new Date(),
        etag: this.generateETag(),
      })
      .where(eq(publications.id, publicationId));
  }

  /**
   * Track a view (analytics)
   */
  async trackView(
    publicationId: string,
    visitorData: {
      ip: string;
      userAgent: string;
      referrer?: string;
      country?: string;
    }
  ): Promise<void> {
    // Create anonymized visitor hash
    const visitorHash = this.hashVisitor(visitorData.ip, visitorData.userAgent);

    // Extract referrer domain
    let referrerDomain: string | undefined;
    if (visitorData.referrer) {
      try {
        const url = new URL(visitorData.referrer);
        referrerDomain = url.hostname;
      } catch {
        // Invalid URL, ignore
      }
    }

    await db.insert(publicationAnalytics).values({
      publicationId,
      visitorHash,
      referrer: visitorData.referrer,
      referrerDomain,
      userAgent: visitorData.userAgent,
      country: visitorData.country,
    });
  }

  /**
   * Get publication statistics
   */
  async getStats(publicationId: string, tenantId: string): Promise<PublicationStats> {
    // Verify publication ownership
    const [publication] = await db
      .select()
      .from(publications)
      .where(
        and(eq(publications.id, publicationId), eq(publications.tenantId, tenantId))
      )
      .limit(1);

    if (!publication) {
      throw new Error('Publication not found');
    }

    // Total views
    const totalViewsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(publicationAnalytics)
      .where(eq(publicationAnalytics.publicationId, publicationId));
    const totalViews = Number(totalViewsResult[0]?.count || 0);

    // Unique visitors
    const uniqueVisitorsResult = await db
      .select({ count: sql<number>`count(distinct ${publicationAnalytics.visitorHash})` })
      .from(publicationAnalytics)
      .where(eq(publicationAnalytics.publicationId, publicationId));
    const uniqueVisitors = Number(uniqueVisitorsResult[0]?.count || 0);

    // Top referrers
    const topReferrers = await db
      .select({
        domain: publicationAnalytics.referrerDomain,
        count: sql<number>`count(*)`,
      })
      .from(publicationAnalytics)
      .where(
        and(
          eq(publicationAnalytics.publicationId, publicationId),
          sql`${publicationAnalytics.referrerDomain} IS NOT NULL`
        )
      )
      .groupBy(publicationAnalytics.referrerDomain)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Views by country
    const viewsByCountry = await db
      .select({
        country: publicationAnalytics.country,
        count: sql<number>`count(*)`,
      })
      .from(publicationAnalytics)
      .where(
        and(
          eq(publicationAnalytics.publicationId, publicationId),
          sql`${publicationAnalytics.country} IS NOT NULL`
        )
      )
      .groupBy(publicationAnalytics.country)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Views over time (last 30 days)
    const viewsOverTime = await db
      .select({
        date: sql<string>`DATE(${publicationAnalytics.viewedAt})`,
        count: sql<number>`count(*)`,
      })
      .from(publicationAnalytics)
      .where(
        and(
          eq(publicationAnalytics.publicationId, publicationId),
          sql`${publicationAnalytics.viewedAt} >= NOW() - INTERVAL '30 days'`
        )
      )
      .groupBy(sql`DATE(${publicationAnalytics.viewedAt})`)
      .orderBy(sql`DATE(${publicationAnalytics.viewedAt})`);

    return {
      publicationId,
      totalViews,
      uniqueVisitors,
      topReferrers: topReferrers.map((r) => ({
        domain: r.domain || 'direct',
        count: Number(r.count),
      })),
      viewsByCountry: viewsByCountry.map((v) => ({
        country: v.country || 'unknown',
        count: Number(v.count),
      })),
      viewsOverTime: viewsOverTime.map((v) => ({
        date: v.date,
        count: Number(v.count),
      })),
    };
  }

  /**
   * Generate ETag for caching
   */
  private generateETag(): string {
    return createHash('sha256')
      .update(Date.now().toString() + randomBytes(16).toString('hex'))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generate access token
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hash visitor for anonymized tracking
   */
  private hashVisitor(ip: string, userAgent: string): string {
    return createHash('sha256')
      .update(`${ip}:${userAgent}`)
      .digest('hex');
  }
}

export const publicationService = new PublicationService();
