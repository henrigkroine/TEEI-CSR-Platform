import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { config } from './config.js';
import * as feedbackCommand from './commands/feedback.js';
import * as recognizeCommand from './commands/recognize.js';

// Create Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages],
});

// Store commands
const commands = new Collection();
commands.set(feedbackCommand.data.name, feedbackCommand);
commands.set(recognizeCommand.data.name, recognizeCommand);

// Ready event
client.once('ready', () => {
  console.log(`✅ Discord bot logged in as ${client.user?.tag}`);
  console.log(`📝 Registered commands: ${Array.from(commands.keys()).join(', ')}`);
});

// Interaction handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`❌ Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);

    const errorMessage = { content: 'There was an error executing this command!', ephemeral: true };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Deploy commands
async function deployCommands() {
  if (!config.discord.token || !config.discord.clientId || !config.discord.guildId) {
    console.error('❌ Missing Discord configuration. Set DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID.');
    return;
  }

  const commandsData = Array.from(commands.values()).map(cmd => cmd.data.toJSON());
  const rest = new REST().setToken(config.discord.token);

  try {
    console.log(`🔄 Deploying ${commandsData.length} slash commands...`);

    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commandsData }
    );

    console.log('✅ Successfully deployed slash commands!');
  } catch (error) {
    console.error('❌ Failed to deploy commands:', error);
  }
}

// Start bot
async function start() {
  if (!config.discord.token) {
    console.error('❌ DISCORD_BOT_TOKEN not set. Bot cannot start.');
    process.exit(1);
  }

  await deployCommands();
  await client.login(config.discord.token);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down Discord bot...');
  client.destroy();
  process.exit(0);
});

start().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
