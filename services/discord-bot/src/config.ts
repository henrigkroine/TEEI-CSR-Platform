export const config = {
  discord: {
    token: process.env.DISCORD_BOT_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
  },
  reporting: {
    apiUrl: process.env.REPORTING_SERVICE_URL || 'http://localhost:3001',
  },
  webhooks: {
    enabled: process.env.ENABLE_DISCORD_WEBHOOKS === 'true',
  },
} as const;
