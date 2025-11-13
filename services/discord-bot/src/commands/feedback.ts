import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { submitFeedbackToQ2Q } from '../utils/q2qClient.js';

export const data = new SlashCommandBuilder()
  .setName('feedback')
  .setDescription('Submit feedback about your volunteering experience')
  .addStringOption((option) =>
    option
      .setName('message')
      .setDescription('Your feedback (what went well, what could be improved)')
      .setRequired(true)
      .setMinLength(10)
      .setMaxLength(500)
  )
  .addStringOption((option) =>
    option
      .setName('sentiment')
      .setDescription('Overall sentiment')
      .setRequired(false)
      .addChoices(
        { name: '😊 Positive', value: 'positive' },
        { name: '😐 Neutral', value: 'neutral' },
        { name: '😞 Negative', value: 'negative' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const feedbackText = interaction.options.getString('message', true);
  const sentiment = interaction.options.getString('sentiment') as 'positive' | 'neutral' | 'negative' | null;

  // Send DM confirmation
  try {
    await interaction.deferReply({ ephemeral: true });

    // Submit to Q2Q
    const success = await submitFeedbackToQ2Q({
      userId: interaction.user.id,
      username: interaction.user.username,
      feedbackText,
      sentiment: sentiment || undefined,
    });

    if (success) {
      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('✅ Feedback Submitted')
        .setDescription('Thank you for your feedback! Your insights help us improve the volunteering experience.')
        .addFields(
          { name: 'Your Feedback', value: feedbackText },
          {
            name: 'Sentiment',
            value: sentiment
              ? sentiment === 'positive'
                ? '😊 Positive'
                : sentiment === 'negative'
                ? '😞 Negative'
                : '😐 Neutral'
              : 'Not specified',
          }
        )
        .setFooter({ text: 'Your feedback will be processed by our Q2Q AI engine' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({
        content: '❌ Failed to submit feedback. Please try again later.',
      });
    }
  } catch (error) {
    console.error('[Feedback] Error:', error);
    await interaction.editReply({
      content: '❌ An error occurred while submitting feedback.',
    });
  }
}
