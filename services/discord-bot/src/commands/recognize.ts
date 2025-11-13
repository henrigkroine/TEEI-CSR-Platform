import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

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

  const embed = new EmbedBuilder()
    .setColor(0xfbbf24)
    .setTitle(`${badgeEmoji} Volunteer Recognition`)
    .setDescription(`**${volunteer.username}** has been recognized for outstanding contribution!`)
    .addFields(
      { name: 'Achievement', value: achievement },
      { name: 'Recognition Level', value: `${badgeEmoji} ${badgeName}` },
      { name: 'Recognized By', value: interaction.user.username }
    )
    .setThumbnail(volunteer.displayAvatarURL())
    .setFooter({ text: 'Keep up the great work! 🎉' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // TODO: Assign Discord role based on badge level
  // TODO: Update VIS score in database
  console.log(`[Recognition] ${volunteer.username} recognized with ${badgeName}`);
}
