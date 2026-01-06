import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { assignRecognitionRole, canPromoteToLevel, getMemberRecognitionLevel } from '../utils/roleManager.js';
import { updateVISScore, calculateVISIncrement, getNextMilestone } from '../utils/visUpdater.js';

export const data = new SlashCommandBuilder()
  .setName('recognize')
  .setDescription('Recognize a volunteer for their outstanding contribution')
  .addUserOption((option) =>
    option
      .setName('volunteer')
      .setDescription('The volunteer to recognize')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('achievement')
      .setDescription('What did they accomplish?')
      .setRequired(true)
      .setMinLength(10)
      .setMaxLength(200)
  )
  .addStringOption((option) =>
    option
      .setName('badge')
      .setDescription('Recognition level')
      .setRequired(false)
      .addChoices(
        { name: '⭐ Emerging', value: 'emerging' },
        { name: '🌟 Contributing', value: 'contributing' },
        { name: '✨ High Impact', value: 'high_impact' },
        { name: '🏆 Exceptional', value: 'exceptional' }
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply(); // Recognition might take a moment

  try {
    const volunteer = interaction.options.getUser('volunteer', true);
    const achievement = interaction.options.getString('achievement', true);
    const badge = interaction.options.getString('badge') || 'contributing';

    const badgeEmoji = {
      emerging: '⭐',
      contributing: '🌟',
      high_impact: '✨',
      exceptional: '🏆',
    }[badge];

    const badgeName = {
      emerging: 'Emerging Volunteer',
      contributing: 'Contributing Volunteer',
      high_impact: 'High Impact Volunteer',
      exceptional: 'Exceptional Volunteer',
    }[badge];

    // Get member object (needed for role assignment)
    const member = interaction.guild?.members.cache.get(volunteer.id) as GuildMember | undefined;

    if (!member) {
      await interaction.editReply({
        content: '❌ Could not find volunteer in this server.',
      });
      return;
    }

    // Check if promotion is allowed
    const promotionCheck = canPromoteToLevel(member, badge);
    if (!promotionCheck.canPromote) {
      await interaction.editReply({
        content: `❌ ${promotionCheck.reason}`,
      });
      return;
    }

    // Get current recognition level
    const currentRecognition = getMemberRecognitionLevel(member);

    // Assign Discord role
    const roleResult = await assignRecognitionRole(member, badge);

    if (!roleResult.success) {
      await interaction.editReply({
        content: `❌ Failed to assign role: ${roleResult.error}`,
      });
      return;
    }

    // Update VIS score in reporting service
    const visResult = await updateVISScore(
      volunteer.id,
      volunteer.username,
      badge,
      achievement,
      interaction.user.username
    );

    // Build public recognition embed
    const embed = new EmbedBuilder()
      .setColor(0xfbbf24)
      .setTitle(`${badgeEmoji} Volunteer Recognition`)
      .setDescription(`**${volunteer.username}** has been recognized for outstanding contribution!`)
      .addFields(
        { name: 'Achievement', value: achievement },
        { name: 'Recognition Level', value: `${badgeEmoji} ${badgeName}` },
        { name: 'Recognized By', value: interaction.user.username }
      );

    // Add role change info if promoted
    if (roleResult.previousRole) {
      embed.addFields({
        name: '📈 Promotion',
        value: `${roleResult.previousRole} → **${badgeName}**`,
        inline: false,
      });
    }

    // Add VIS info if update successful
    if (visResult.success && visResult.newScore) {
      const nextMilestone = getNextMilestone(visResult.newScore);

      embed.addFields({
        name: '🎯 VIS Score Updated',
        value: `+${visResult.increment} points → **${visResult.newScore} total**`,
        inline: true,
      });

      if (nextMilestone) {
        embed.addFields({
          name: `${nextMilestone.emoji} Next Milestone`,
          value: `${nextMilestone.title} (${nextMilestone.pointsNeeded} points away)`,
          inline: true,
        });
      }
    }

    embed
      .setThumbnail(volunteer.displayAvatarURL())
      .setFooter({ text: 'Keep up the great work! 🎉' })
      .setTimestamp();

    // Post public recognition
    await interaction.editReply({ embeds: [embed] });

    // Send DM to volunteer with details
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle(`${badgeEmoji} Congratulations!`)
        .setDescription('You have been recognized for your outstanding volunteer work!')
        .addFields(
          { name: 'Achievement', value: achievement },
          { name: 'Recognition Level', value: `${badgeEmoji} ${badgeName}` },
          { name: 'Recognized By', value: interaction.user.username },
          {
            name: 'What This Means',
            value: 'Your dedication and impact have been noticed! This recognition:\n' +
                   `• Grants you the **${badgeName}** role\n` +
                   `• Increases your VIS (Volunteer Impact Score) by **${calculateVISIncrement(badge)} points**\n` +
                   '• Demonstrates your commitment to social impact\n' +
                   '• Contributes to our organization\'s impact reporting',
          }
        )
        .setFooter({ text: 'Thank you for making a difference! 💚' })
        .setTimestamp();

      await volunteer.send({ embeds: [dmEmbed] });
    } catch (dmError) {
      console.error('[Recognition] Could not send DM to volunteer:', dmError);
      // Don't fail the recognition if DM fails (user may have DMs disabled)
    }

    console.log(`[Recognition] ${volunteer.username} recognized with ${badgeName}`, {
      roleAssigned: roleResult.success,
      visUpdated: visResult.success,
      newVIS: visResult.newScore,
    });
  } catch (error: any) {
    console.error('[Recognition] Error:', error);
    await interaction.editReply({
      content: '❌ An error occurred while processing recognition. Please try again.',
    });
  }
}
