/**
 * Stripe Webhook Handler
 * Processes Stripe events (invoice.paid, subscription.updated, etc.)
 */

import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { getDb } from '@teei/shared-schema';
import {
  billingSubscriptions,
  billingInvoices,
  billingEvents,
  billingCustomers,
} from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function webhookRoutes(fastify: FastifyInstance) {
  const db = getDb();

  /**
   * POST /api/billing/webhooks/stripe
   * Handle Stripe webhook events
   */
  fastify.post(
    '/api/billing/webhooks/stripe',
    {
      config: {
        rawBody: true, // Required for Stripe signature verification
      },
    },
    async (request, reply) => {
      const sig = request.headers['stripe-signature'] as string;

      if (!sig) {
        return reply.status(400).send({
          success: false,
          error: 'Missing stripe-signature header',
        });
      }

      let event: Stripe.Event;

      try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(
          request.rawBody || JSON.stringify(request.body),
          sig,
          WEBHOOK_SECRET
        );
      } catch (error: any) {
        request.log.error('Webhook signature verification failed:', error);
        return reply.status(400).send({
          success: false,
          error: 'Invalid signature',
          message: error.message,
        });
      }

      request.log.info(`Received Stripe webhook: ${event.type}`, {
        eventId: event.id,
        type: event.type,
      });

      // Check for duplicate events (idempotency)
      const [existingEvent] = await db
        .select()
        .from(billingEvents)
        .where(eq(billingEvents.stripeEventId, event.id));

      if (existingEvent && existingEvent.processed) {
        request.log.info('Event already processed (idempotency)', {
          eventId: event.id,
        });
        return { received: true, alreadyProcessed: true };
      }

      try {
        // Route event to appropriate handler
        switch (event.type) {
          case 'customer.subscription.created':
          case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
            break;

          case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
            break;

          case 'invoice.paid':
            await handleInvoicePaid(event.data.object as Stripe.Invoice);
            break;

          case 'invoice.payment_failed':
            await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
            break;

          case 'invoice.finalized':
            await handleInvoiceFinalized(event.data.object as Stripe.Invoice);
            break;

          case 'customer.updated':
            await handleCustomerUpdated(event.data.object as Stripe.Customer);
            break;

          default:
            request.log.debug(`Unhandled event type: ${event.type}`);
        }

        // Record event as processed
        const companyId = await getCompanyIdFromEvent(event);

        await db.insert(billingEvents).values({
          companyId: companyId || null,
          eventType: event.type,
          eventSource: 'stripe',
          stripeEventId: event.id,
          payload: event.data.object as any,
          processed: true,
          processedAt: new Date(),
        });

        return { received: true };
      } catch (error: any) {
        request.log.error('Error processing webhook:', error);

        // Record failed event
        const companyId = await getCompanyIdFromEvent(event);

        await db.insert(billingEvents).values({
          companyId: companyId || null,
          eventType: event.type,
          eventSource: 'stripe',
          stripeEventId: event.id,
          payload: event.data.object as any,
          processed: false,
          error: error.message,
        });

        return reply.status(500).send({
          success: false,
          error: 'Failed to process webhook',
          message: error.message,
        });
      }
    }
  );
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const db = getDb();
  const companyId = subscription.metadata.companyId;

  if (!companyId) {
    throw new Error('Missing companyId in subscription metadata');
  }

  const [customer] = await db
    .select()
    .from(billingCustomers)
    .where(eq(billingCustomers.stripeCustomerId, subscription.customer as string));

  if (!customer) {
    throw new Error(`Customer not found for Stripe customer ${subscription.customer}`);
  }

  // Check if subscription exists
  const [existing] = await db
    .select()
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.stripeSubscriptionId, subscription.id));

  const plan = subscription.metadata.plan as any || 'pro';
  const seatCount = subscription.items.data[0]?.quantity || 1;

  if (existing) {
    // Update existing subscription
    await db
      .update(billingSubscriptions)
      .set({
        status: subscription.status as any,
        seatCount,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        updatedAt: new Date(),
      })
      .where(eq(billingSubscriptions.id, existing.id));
  } else {
    // Create new subscription record
    await db.insert(billingSubscriptions).values({
      companyId,
      customerId: customer.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id || '',
      plan,
      status: subscription.status as any,
      seatCount,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    });
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.stripeSubscriptionId, subscription.id));

  if (existing) {
    await db
      .update(billingSubscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(billingSubscriptions.id, existing.id));
  }
}

/**
 * Handle invoice paid
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const db = getDb();

  const [customer] = await db
    .select()
    .from(billingCustomers)
    .where(eq(billingCustomers.stripeCustomerId, invoice.customer as string));

  if (!customer) {
    throw new Error(`Customer not found for invoice ${invoice.id}`);
  }

  // Check if invoice already exists
  const [existing] = await db
    .select()
    .from(billingInvoices)
    .where(eq(billingInvoices.stripeInvoiceId, invoice.id));

  if (existing) {
    // Update existing invoice
    await db
      .update(billingInvoices)
      .set({
        status: 'paid',
        amountPaid: invoice.amount_paid,
        paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
        updatedAt: new Date(),
      })
      .where(eq(billingInvoices.id, existing.id));
  } else {
    // Create new invoice record
    await createInvoiceRecord(invoice, customer.id, customer.companyId);
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(billingInvoices)
    .where(eq(billingInvoices.stripeInvoiceId, invoice.id));

  if (existing) {
    await db
      .update(billingInvoices)
      .set({
        status: 'open',
        updatedAt: new Date(),
      })
      .where(eq(billingInvoices.id, existing.id));
  }

  // TODO: Send payment failure notification to customer
}

/**
 * Handle invoice finalized
 */
async function handleInvoiceFinalized(invoice: Stripe.Invoice): Promise<void> {
  const db = getDb();

  const [customer] = await db
    .select()
    .from(billingCustomers)
    .where(eq(billingCustomers.stripeCustomerId, invoice.customer as string));

  if (!customer) {
    throw new Error(`Customer not found for invoice ${invoice.id}`);
  }

  await createInvoiceRecord(invoice, customer.id, customer.companyId);
}

/**
 * Handle customer updated
 */
async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(billingCustomers)
    .where(eq(billingCustomers.stripeCustomerId, customer.id));

  if (existing) {
    await db
      .update(billingCustomers)
      .set({
        email: customer.email || existing.email,
        name: customer.name || existing.name,
        updatedAt: new Date(),
      })
      .where(eq(billingCustomers.id, existing.id));
  }
}

/**
 * Create invoice record from Stripe invoice
 */
async function createInvoiceRecord(
  invoice: Stripe.Invoice,
  customerId: string,
  companyId: string
): Promise<void> {
  const db = getDb();

  // Get subscription if exists
  const [subscription] = invoice.subscription
    ? await db
        .select()
        .from(billingSubscriptions)
        .where(eq(billingSubscriptions.stripeSubscriptionId, invoice.subscription as string))
    : [null];

  // Map line items
  const lineItems = invoice.lines.data.map((line) => ({
    description: line.description || '',
    quantity: line.quantity || 1,
    unitPrice: line.price?.unit_amount || 0,
    amount: line.amount,
    period: line.period
      ? {
          start: new Date(line.period.start * 1000).toISOString(),
          end: new Date(line.period.end * 1000).toISOString(),
        }
      : undefined,
  }));

  await db.insert(billingInvoices).values({
    companyId,
    customerId,
    subscriptionId: subscription?.id || null,
    stripeInvoiceId: invoice.id,
    stripePaymentIntentId: invoice.payment_intent as string | null,
    invoiceNumber: invoice.number || undefined,
    status: invoice.status as any,
    subtotal: invoice.subtotal,
    tax: invoice.tax || 0,
    total: invoice.total,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    periodStart: new Date(invoice.period_start * 1000),
    periodEnd: new Date(invoice.period_end * 1000),
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
    paidAt: invoice.status_transitions.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : null,
    invoicePdfUrl: invoice.invoice_pdf || undefined,
    hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
    lineItems,
  });
}

/**
 * Extract companyId from Stripe event
 */
async function getCompanyIdFromEvent(event: Stripe.Event): Promise<string | null> {
  const db = getDb();

  // Try to extract from metadata
  const metadata = (event.data.object as any).metadata;
  if (metadata?.companyId) {
    return metadata.companyId;
  }

  // Try to get from customer
  const customerId = (event.data.object as any).customer;
  if (customerId) {
    const [customer] = await db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.stripeCustomerId, customerId));

    if (customer) {
      return customer.companyId;
    }
  }

  return null;
}
