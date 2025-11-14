import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Get help with available commands and features');

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member;
  const isAdmin = member && 'permissions' in member
    ? member.permissions.has(PermissionFlagsBits.ManageRoles)
    : false;

  // Build help embed
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🤖 TEEI Discord Bot - Help')
    .setDescription('Welcome to the TEEI platform Discord bot! Here are the available commands:')
    .setTimestamp();

  // Volunteer commands (available to everyone)
  embed.addFields({
    name: '📝 `/feedback` - Submit Feedback',
    value: 'Share your volunteering experience with us. Your feedback helps improve programs and creates impact metrics.\n' +
           '**Usage:** `/feedback message:"Your feedback here" sentiment:positive`\n' +
           '**Note:** Feedback is processed by our Q2Q AI engine to generate qualitative insights.',
  });

  // Admin commands (only if user has permissions)
  if (isAdmin) {
    embed.addFields(
      {
        name: '🏆 `/recognize` - Recognize a Volunteer (Admin Only)',
        value: 'Recognize a volunteer for their outstanding contribution. This assigns a role and updates their VIS (Volunteer Impact Score).\n' +
               '**Usage:** `/recognize volunteer:@user achievement:"What they did" badge:high_impact`\n' +
               '**Badge Levels:**\n' +
               '  ⭐ Emerging - New volunteers showing promise\n' +
               '  🌟 Contributing - Consistent contributors\n' +
               '  ✨ High Impact - Volunteers making significant difference\n' +
               '  🏆 Exceptional - Top-tier volunteers with exceptional dedication',
      },
      {
        name: '⚙️ Admin Features',
        value: 'As an admin, you can:\n' +
               '• Recognize volunteers and assign achievement roles\n' +
               '• Update Volunteer Impact Scores (VIS)\n' +
               '• View aggregated feedback insights\n' +
               '• Manage volunteer milestones',
      }
    );
  }

  // General information
  embed.addFields(
    {
      name: '📊 About VIS (Volunteer Impact Score)',
      value: 'VIS measures volunteer engagement, consistency, and impact. Recognition increases your VIS score, ' +
             'which is used in impact reporting and demonstrates your contribution to social programs.',
    },
    {
      name: '🔗 Additional Resources',
      value: '• [Platform Documentation](https://docs.teei-platform.com)\n' +
             '• [Volunteer Guidelines](https://docs.teei-platform.com/volunteering)\n' +
             '• [Privacy Policy](https://docs.teei-platform.com/privacy)',
    },
    {
      name: '💡 Need More Help?',
      value: 'Contact your program coordinator or reach out in the #support channel.',
    }
  );

  // Footer with version info
  embed.setFooter({
    text: 'TEEI Platform v1.0 | Built with ❤️ for social impact',
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
