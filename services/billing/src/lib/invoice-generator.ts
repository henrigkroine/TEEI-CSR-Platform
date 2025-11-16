/**
 * Invoice Generator
 * Creates invoices from usage metrics with PDF export
 */

import type { Invoice, UsageMetric, PricingTier } from '../types/index.js';
import { DEFAULT_PRICING } from '../types/index.js';
import { randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';
import type { Readable } from 'stream';

export class InvoiceGenerator {
  constructor(private pricingTier: PricingTier = DEFAULT_PRICING) {}

  /**
   * Generate invoice from usage metrics
   */
  async generate(
    tenantId: string,
    tenantName: string,
    usage: UsageMetric[],
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
  ): Promise<Invoice> {
    const lineItems: Invoice['lineItems'] = [];

    // Aggregate usage across all metrics
    const aggregated = usage.reduce(
      (acc, u) => ({
        computeHours: acc.computeHours + u.infra.computeHours,
        storageGB: acc.storageGB + u.infra.storageGB,
        bandwidthGB: acc.bandwidthGB + u.infra.bandwidthGB,
        dbQueries: acc.dbQueries + u.infra.dbQueries,
        inputTokens: acc.inputTokens + u.ai.inputTokens,
        outputTokens: acc.outputTokens + u.ai.outputTokens,
        aiCost: acc.aiCost + u.ai.totalCostUSD,
      }),
      {
        computeHours: 0,
        storageGB: 0,
        bandwidthGB: 0,
        dbQueries: 0,
        inputTokens: 0,
        outputTokens: 0,
        aiCost: 0,
      },
    );

    // Infrastructure line items
    if (aggregated.computeHours > 0) {
      lineItems.push({
        description: `Compute Hours (${aggregated.computeHours.toFixed(2)} hours)`,
        quantity: aggregated.computeHours,
        unitPrice: this.pricingTier.infra.computePerHour,
        totalUSD: aggregated.computeHours * this.pricingTier.infra.computePerHour,
        category: 'infra',
      });
    }

    if (aggregated.storageGB > 0) {
      lineItems.push({
        description: `Storage (${aggregated.storageGB.toFixed(2)} GB-months)`,
        quantity: aggregated.storageGB,
        unitPrice: this.pricingTier.infra.storagePerGBMonth,
        totalUSD: aggregated.storageGB * this.pricingTier.infra.storagePerGBMonth,
        category: 'storage',
      });
    }

    if (aggregated.bandwidthGB > 0) {
      lineItems.push({
        description: `Bandwidth (${aggregated.bandwidthGB.toFixed(2)} GB)`,
        quantity: aggregated.bandwidthGB,
        unitPrice: this.pricingTier.infra.bandwidthPerGB,
        totalUSD: aggregated.bandwidthGB * this.pricingTier.infra.bandwidthPerGB,
        category: 'bandwidth',
      });
    }

    if (aggregated.dbQueries > 0) {
      lineItems.push({
        description: `Database Queries (${aggregated.dbQueries.toLocaleString()} queries)`,
        quantity: aggregated.dbQueries / 1000,
        unitPrice: this.pricingTier.infra.dbQueryPer1000,
        totalUSD: (aggregated.dbQueries / 1000) * this.pricingTier.infra.dbQueryPer1000,
        category: 'infra',
      });
    }

    // AI token line items
    if (aggregated.inputTokens > 0 || aggregated.outputTokens > 0) {
      lineItems.push({
        description: `AI Input Tokens (${(aggregated.inputTokens / 1000).toFixed(1)}K tokens)`,
        quantity: aggregated.inputTokens / 1000,
        unitPrice: this.pricingTier.ai.inputTokensPer1K,
        totalUSD: (aggregated.inputTokens / 1000) * this.pricingTier.ai.inputTokensPer1K,
        category: 'ai',
      });

      lineItems.push({
        description: `AI Output Tokens (${(aggregated.outputTokens / 1000).toFixed(1)}K tokens)`,
        quantity: aggregated.outputTokens / 1000,
        unitPrice: this.pricingTier.ai.outputTokensPer1K,
        totalUSD: (aggregated.outputTokens / 1000) * this.pricingTier.ai.outputTokensPer1K,
        category: 'ai',
      });
    }

    // Calculate totals
    const subtotalUSD = lineItems.reduce((sum, item) => sum + item.totalUSD, 0);

    // Apply volume discounts
    let discountUSD = 0;
    for (const discount of this.pricingTier.volumeDiscounts) {
      if (subtotalUSD >= discount.thresholdUSD) {
        discountUSD = subtotalUSD * (discount.discountPercent / 100);
      }
    }

    const totalUSD = subtotalUSD - discountUSD;

    // Due date: 30 days from period end
    const dueDate = new Date(billingPeriodEnd);
    dueDate.setDate(dueDate.getDate() + 30);

    return {
      invoiceId: randomUUID(),
      tenantId,
      billingPeriod: {
        start: billingPeriodStart.toISOString(),
        end: billingPeriodEnd.toISOString(),
      },
      lineItems,
      subtotalUSD,
      taxUSD: 0,
      discountUSD,
      totalUSD,
      status: 'draft',
      dueDate: dueDate.toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Export invoice to PDF
   * Returns a readable stream that can be piped to a file or HTTP response
   */
  async exportPDF(invoice: Invoice, tenantName: string): Promise<Readable> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Header
    doc
      .fontSize(20)
      .text('INVOICE', 50, 50)
      .fontSize(10)
      .text(`Invoice #: ${invoice.invoiceId.split('-')[0]}`, 50, 80)
      .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 50, 95)
      .text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 50, 110);

    // Tenant info
    doc
      .fontSize(12)
      .text('BILL TO:', 50, 150)
      .fontSize(10)
      .text(tenantName, 50, 170)
      .text(`Tenant ID: ${invoice.tenantId}`, 50, 185);

    // Billing period
    doc
      .fontSize(12)
      .text('BILLING PERIOD:', 350, 150)
      .fontSize(10)
      .text(
        `${new Date(invoice.billingPeriod.start).toLocaleDateString()} - ${new Date(invoice.billingPeriod.end).toLocaleDateString()}`,
        350,
        170,
      );

    // Line items table
    const tableTop = 250;
    doc.fontSize(10);

    // Table headers
    doc
      .text('Description', 50, tableTop)
      .text('Quantity', 280, tableTop)
      .text('Unit Price', 360, tableTop)
      .text('Total', 480, tableTop);

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table rows
    let yPosition = tableTop + 25;
    for (const item of invoice.lineItems) {
      doc
        .text(item.description, 50, yPosition, { width: 220 })
        .text(item.quantity.toFixed(2), 280, yPosition)
        .text(`$${item.unitPrice.toFixed(4)}`, 360, yPosition)
        .text(`$${item.totalUSD.toFixed(2)}`, 480, yPosition);

      yPosition += 20;

      // Add new page if needed
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
    }

    // Subtotal, discount, total
    yPosition += 20;
    doc
      .moveTo(50, yPosition)
      .lineTo(550, yPosition)
      .stroke();

    yPosition += 15;
    doc
      .text('Subtotal:', 380, yPosition)
      .text(`$${invoice.subtotalUSD.toFixed(2)}`, 480, yPosition);

    if (invoice.discountUSD > 0) {
      yPosition += 20;
      doc
        .text('Discount:', 380, yPosition)
        .text(`-$${invoice.discountUSD.toFixed(2)}`, 480, yPosition);
    }

    if (invoice.taxUSD > 0) {
      yPosition += 20;
      doc
        .text('Tax:', 380, yPosition)
        .text(`$${invoice.taxUSD.toFixed(2)}`, 480, yPosition);
    }

    yPosition += 20;
    doc
      .fontSize(12)
      .text('TOTAL:', 380, yPosition)
      .text(`$${invoice.totalUSD.toFixed(2)}`, 480, yPosition);

    // Footer
    doc
      .fontSize(8)
      .text(
        'Thank you for your business. Payment is due within 30 days.',
        50,
        yPosition + 100,
        { align: 'center' },
      );

    doc.end();

    return doc as unknown as Readable;
  }

  /**
   * Export invoice to CSV
   */
  async exportCSV(invoice: Invoice): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push('Invoice ID,Tenant ID,Billing Period Start,Billing Period End,Status,Due Date,Total USD');
    lines.push(
      [
        invoice.invoiceId,
        invoice.tenantId,
        invoice.billingPeriod.start,
        invoice.billingPeriod.end,
        invoice.status,
        invoice.dueDate,
        invoice.totalUSD.toFixed(2),
      ].join(','),
    );

    // Line items
    lines.push('');
    lines.push('Description,Quantity,Unit Price,Total,Category');
    for (const item of invoice.lineItems) {
      lines.push(
        [
          `"${item.description}"`,
          item.quantity.toFixed(2),
          item.unitPrice.toFixed(4),
          item.totalUSD.toFixed(2),
          item.category,
        ].join(','),
      );
    }

    // Summary
    lines.push('');
    lines.push(`Subtotal,${invoice.subtotalUSD.toFixed(2)}`);
    if (invoice.discountUSD > 0) {
      lines.push(`Discount,-${invoice.discountUSD.toFixed(2)}`);
    }
    if (invoice.taxUSD > 0) {
      lines.push(`Tax,${invoice.taxUSD.toFixed(2)}`);
    }
    lines.push(`Total,${invoice.totalUSD.toFixed(2)}`);

    return lines.join('\n');
  }

  /**
   * Export invoice to JSON
   */
  async exportJSON(invoice: Invoice): Promise<string> {
    return JSON.stringify(invoice, null, 2);
  }
}
