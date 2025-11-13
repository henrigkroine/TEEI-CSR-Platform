module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only
        'style',    // Formatting, missing semicolons, etc
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf',     // Performance improvement
        'test',     // Adding tests
        'chore',    // Maintenance tasks
        'revert',   // Revert a previous commit
        'build',    // Build system or dependencies
        'ci',       // CI configuration
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'root',
        'corp-cockpit',
        'buddy-service',
        'kintell-connector',
        'upskilling-connector',
        'unified-profile',
        'q2q-ai',
        'reporting',
        'safety-moderation',
        'discord-bot',
        'notifications',
        'api-gateway',
        'shared-schema',
        'event-contracts',
        'shared-types',
        'shared-utils',
        'docs',
        'ci',
      ],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
