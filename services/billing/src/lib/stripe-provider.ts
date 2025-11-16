/**
 * Stripe Payment Provider Stub
 * Integration with Stripe for payment processing
 * Stub implementation - production requires Stripe API keys
 */

import type { Invoice } from '../types/index.js';
import Stripe from 'stripe';

export interface PaymentProvider {
  createInvoice(invoice: Invoice, customerEmail: string): Promise<{ providerInvoiceId: string; paymentUrl: string }>;
  getInvoiceStatus(providerInvoiceId: string): Promise<'draft' | 'pending' | 'paid' | 'overdue' | 'void'>;
  processPayment(providerInvoiceId: string, paymentMethodId: string): Promise<{ success: boolean; transactionId?: string }>;
  createCustomer(tenantId: string, email: string, name: string): Promise<{ customerId: string }>;
  setupBillingPortal(customerId: string): Promise<{ portalUrl: string }>;
}

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe | null = null;
  private stubMode: boolean;

  constructor(apiKey?: string) {
    if (apiKey && apiKey !== 'stub') {
      this.stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });
      this.stubMode = false;
    } else {
      this.stubMode = true;
      console.warn('[Stripe] Running in STUB MODE - no actual payments will be processed');
    }
  }

  /**
   * Create invoice in Stripe
   */
  async createInvoice(invoice: Invoice, customerEmail: string): Promise<{ providerInvoiceId: string; paymentUrl: string }> {
    if (this.stubMode) {
      // Stub implementation
      const stubInvoiceId = `stub_inv_${invoice.invoiceId.split('-')[0]}`;
      return {
        providerInvoiceId: stubInvoiceId,
        paymentUrl: `https://stub-payment.example.com/invoice/${stubInvoiceId}`,
      };
    }

    // Real Stripe implementation
    if (!this.stripe) throw new Error('Stripe not initialized');

    // Create or get customer
    const customers = await this.stripe.customers.list({ email: customerEmail, limit: 1 });
    const customer: Stripe.Customer = customers.data.length > 0
      ? customers.data[0]!
      : await this.stripe.customers.create({
          email: customerEmail,
          metadata: { tenantId: invoice.tenantId },
        });

    // Create invoice
    const stripeInvoice = await this.stripe.invoices.create({
      customer: customer.id,
      auto_advance: false, // Manual finalization
      collection_method: 'send_invoice',
      days_until_due: 30,
      metadata: {
        teei_invoice_id: invoice.invoiceId,
        tenant_id: invoice.tenantId,
      },
    });

    // Add line items
    for (const item of invoice.lineItems) {
      await this.stripe.invoiceItems.create({
        customer: customer.id,
        invoice: stripeInvoice.id,
        description: item.description,
        quantity: Math.floor(item.quantity * 100), // Stripe uses integers
        unit_amount: Math.floor(item.unitPrice * 100), // Convert to cents
        currency: 'usd',
      });
    }

    // Finalize invoice
    const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(stripeInvoice.id);

    return {
      providerInvoiceId: finalizedInvoice.id,
      paymentUrl: finalizedInvoice.hosted_invoice_url || '',
    };
  }

  /**
   * Get invoice status from Stripe
   */
  async getInvoiceStatus(providerInvoiceId: string): Promise<'draft' | 'pending' | 'paid' | 'overdue' | 'void'> {
    if (this.stubMode) {
      // Stub: randomly return status
      const statuses: Array<'draft' | 'pending' | 'paid' | 'overdue' | 'void'> = ['draft', 'pending', 'paid', 'overdue', 'void'];
      return statuses[Math.floor(Math.random() * statuses.length)]!;
    }

    if (!this.stripe) throw new Error('Stripe not initialized');

    const invoice = await this.stripe.invoices.retrieve(providerInvoiceId);

    if (invoice.status === 'paid') return 'paid';
    if (invoice.status === 'void') return 'void';
    if (invoice.status === 'open' && invoice.due_date && Date.now() > invoice.due_date * 1000) return 'overdue';
    if (invoice.status === 'open') return 'pending';
    return 'draft';
  }

  /**
   * Process payment for invoice
   */
  async processPayment(
    providerInvoiceId: string,
    paymentMethodId: string,
  ): Promise<{ success: boolean; transactionId?: string }> {
    if (this.stubMode) {
      // Stub: always succeed
      return {
        success: true,
        transactionId: `stub_txn_${Math.random().toString(36).substring(7)}`,
      };
    }

    if (!this.stripe) throw new Error('Stripe not initialized');

    try {
      const invoice = await this.stripe.invoices.retrieve(providerInvoiceId);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: invoice.amount_due,
        currency: 'usd',
        customer: invoice.customer as string,
        payment_method: paymentMethodId,
        confirm: true,
        metadata: {
          invoice_id: providerInvoiceId,
        },
      });

      // Pay invoice
      await this.stripe.invoices.pay(providerInvoiceId, {
        paid_out_of_band: true,
      });

      return {
        success: paymentIntent.status === 'succeeded',
        transactionId: paymentIntent.id,
      };
    } catch (error) {
      console.error('[Stripe] Payment failed:', error);
      return { success: false };
    }
  }

  /**
   * Create Stripe customer
   */
  async createCustomer(tenantId: string, email: string, name: string): Promise<{ customerId: string }> {
    if (this.stubMode) {
      return { customerId: `stub_cus_${tenantId.split('-')[0]}` };
    }

    if (!this.stripe) throw new Error('Stripe not initialized');

    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { tenantId },
    });

    return { customerId: customer.id };
  }

  /**
   * Create billing portal session for customer self-service
   */
  async setupBillingPortal(customerId: string): Promise<{ portalUrl: string }> {
    if (this.stubMode) {
      return { portalUrl: `https://stub-billing.example.com/portal/${customerId}` };
    }

    if (!this.stripe) throw new Error('Stripe not initialized');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://app.teei.io/billing',
    });

    return { portalUrl: session.url };
  }

  /**
   * Sync invoice status from Stripe
   * Call this periodically to update local invoice statuses
   */
  async syncInvoiceStatus(localInvoice: Invoice): Promise<Invoice['status']> {
    if (!localInvoice.stripeInvoiceId) {
      return localInvoice.status;
    }

    const stripeStatus = await this.getInvoiceStatus(localInvoice.stripeInvoiceId);
    return stripeStatus;
  }

  /**
   * Handle Stripe webhook events
   * Process invoice.paid, invoice.payment_failed, etc.
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    if (this.stubMode) {
      console.log('[Stripe Webhook Stub]', event.type);
      return;
    }

    switch (event.type) {
      case 'invoice.paid':
        console.log('[Stripe] Invoice paid:', (event.data.object as Stripe.Invoice).id);
        // Update local invoice status to 'paid'
        break;

      case 'invoice.payment_failed':
        console.log('[Stripe] Payment failed:', (event.data.object as Stripe.Invoice).id);
        // Update local invoice status to 'overdue'
        break;

      case 'customer.subscription.deleted':
        console.log('[Stripe] Subscription cancelled:', (event.data.object as Stripe.Subscription).id);
        // Handle subscription cancellation
        break;

      default:
        console.log('[Stripe] Unhandled event type:', event.type);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): Stripe.Event | null {
    if (this.stubMode || !this.stripe) {
      return null;
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      console.error('[Stripe] Webhook signature verification failed:', error);
      return null;
    }
  }
}

/**
 * Factory for creating payment provider
 * Automatically uses stub mode if no API key provided
 */
export function createPaymentProvider(stripeApiKey?: string): PaymentProvider {
  return new StripeProvider(stripeApiKey || process.env.STRIPE_API_KEY);
}
