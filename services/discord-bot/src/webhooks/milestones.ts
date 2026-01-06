import { WebhookClient, EmbedBuilder } from 'discord.js';

export interface MilestoneEvent {
  type: 'hours' | 'sroi' | 'impact' | 'volunteer_count';
  companyName: string;
  milestone: number;
  currentValue: number;
  message: string;
}

export class MilestoneWebhook {
  private webhook: WebhookClient | null = null;

  constructor(webhookUrl?: string) {
    if (webhookUrl) {
      this.webhook = new WebhookClient({ url: webhookUrl });
    }
  }

  async sendMilestone(event: MilestoneEvent): Promise<boolean> {
    if (!this.webhook) {
      console.log('[Webhook] No webhook configured, skipping milestone notification');
      return false;
    }

    try {
      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle(`🎉 Milestone Achieved!`)
        .setDescription(event.message)
        .addFields(
          { name: 'Company', value: event.companyName, inline: true },
          { name: 'Milestone', value: event.milestone.toString(), inline: true },
          { name: 'Current Value', value: event.currentValue.toString(), inline: true }
        )
        .setFooter({ text: 'TEEI Corporate Cockpit' })
        .setTimestamp();

      await this.webhook.send({ embeds: [embed] });
      return true;
    } catch (error) {
      console.error('[Webhook] Failed to send milestone:', error);
      return false;
    }
  }

  async sendHoursMilestone(companyName: string, hours: number): Promise<boolean> {
    return this.sendMilestone({
      type: 'hours',
      companyName,
      milestone: Math.floor(hours / 100) * 100,
      currentValue: hours,
      message: `${companyName} has reached ${hours} volunteer hours! 🎉`,
    });
  }

  async sendSROIMilestone(companyName: string, sroi: number): Promise<boolean> {
    return this.sendMilestone({
      type: 'sroi',
      companyName,
      milestone: Math.floor(sroi),
      currentValue: sroi,
      message: `${companyName} has achieved an SROI ratio of ${sroi.toFixed(2)}:1! 💰`,
    });
  }
}
