/**
 * FX Converter
 *
 * Converts currencies to base currency using FX rates
 */

import type {
  TenantMetricData,
  FxRate,
  FxConversion,
} from '@teei/shared-types';
import { db } from '@teei/shared-schema';
import { fxRates } from '@teei/shared-schema';
import { eq, and, lte } from 'drizzle-orm';

export class FxConverter {
  private usedRates: FxRate[] = [];

  /**
   * Convert all tenant metrics to base currency
   */
  async convertToBase(
    metrics: TenantMetricData[],
    baseCurrency: string,
    rateDate: string
  ): Promise<TenantMetricData[]> {
    this.usedRates = [];

    const converted: TenantMetricData[] = [];

    for (const metric of metrics) {
      if (metric.currency === baseCurrency) {
        // Already in base currency
        converted.push(metric);
      } else {
        // Convert to base currency
        const rate = await this.getRate(metric.currency, baseCurrency, rateDate);

        if (!rate) {
          throw new Error(
            `FX rate not found: ${metric.currency} -> ${baseCurrency} on ${rateDate}`
          );
        }

        converted.push({
          ...metric,
          value: metric.value * rate.rate,
          currency: baseCurrency,
          metadata: {
            ...metric.metadata,
            originalValue: metric.value,
            originalCurrency: metric.currency,
            fxRate: rate.rate,
            fxRateDate: rateDate,
          },
        });

        // Track used rate
        if (!this.usedRates.find(r => r.id === rate.id)) {
          this.usedRates.push(rate);
        }
      }
    }

    return converted;
  }

  /**
   * Get FX rate for a specific date
   */
  private async getRate(
    fromCurrency: string,
    toCurrency: string,
    date: string
  ): Promise<FxRate | null> {
    // Try direct rate (from -> to)
    const [directRate] = await db.select()
      .from(fxRates)
      .where(
        and(
          eq(fxRates.base, fromCurrency),
          eq(fxRates.quote, toCurrency),
          lte(fxRates.day, date)
        )
      )
      .orderBy(fxRates.day)
      .limit(1);

    if (directRate) {
      return directRate;
    }

    // Try inverse rate (to -> from)
    const [inverseRate] = await db.select()
      .from(fxRates)
      .where(
        and(
          eq(fxRates.base, toCurrency),
          eq(fxRates.quote, fromCurrency),
          lte(fxRates.day, date)
        )
      )
      .orderBy(fxRates.day)
      .limit(1);

    if (inverseRate) {
      // Invert the rate
      return {
        ...inverseRate,
        base: fromCurrency,
        quote: toCurrency,
        rate: 1 / parseFloat(inverseRate.rate),
      };
    }

    // TODO: Try cross rates (from -> USD -> to)
    // For now, return null if no rate found
    return null;
  }

  /**
   * Get all FX rates used in the last conversion
   */
  getUsedRates(): FxRate[] {
    return this.usedRates;
  }

  /**
   * Convert a single amount
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date: string
  ): Promise<FxConversion> {
    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        amount,
        rate: 1,
        convertedAmount: amount,
        date,
      };
    }

    const rate = await this.getRate(fromCurrency, toCurrency, date);

    if (!rate) {
      throw new Error(
        `FX rate not found: ${fromCurrency} -> ${toCurrency} on ${date}`
      );
    }

    return {
      fromCurrency,
      toCurrency,
      amount,
      rate: parseFloat(rate.rate),
      convertedAmount: amount * parseFloat(rate.rate),
      date,
    };
  }
}
