import { EmbedBuilder } from '@discordjs/builders';

const webhookUrl = process.env.UTILS_LOGGING_DISCORD_WEBHOOK;
let shouldLogToDiscord = !!webhookUrl;

if (webhookUrl && !URL.canParse(webhookUrl)) {
  console.warn(
    'Invalid Discord webhook URL provided, logging to Discord will be disabled.'
  );
  shouldLogToDiscord = false;
}

const logToDiscord = async (
  embed: EmbedBuilder,
  content: string | null = null
) => {
  if (!webhookUrl || !shouldLogToDiscord) {
    console.info(`[DISCORD LOG] `, JSON.stringify(embed.data));
    return;
  }
  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content,
      embeds: [embed.toJSON()],
      username: 'UnInbox Logger',
      avatar_url: 'https://app.uninbox.com/logo.png'
    })
  }).catch((err) => {
    console.error(`Failed to log to Discord: ${err}`);
    console.info(`[DISCORD LOG] `, JSON.stringify(embed.data));
  });
};

export const info = (message: string) => {
  const infoEmbed = new EmbedBuilder()
    .setTitle('Info')
    .setDescription(message)
    .setColor(239861) // BLUE
    .setTimestamp(Date.now());
  return logToDiscord(infoEmbed, '@silent');
};

export const alert = (message: string) => {
  const alertEmbed = new EmbedBuilder()
    .setTitle('Alert')
    .setDescription(message)
    .setColor(16101635) // YELLOW
    .setTimestamp(Date.now());
  return logToDiscord(alertEmbed);
};

export const critical = (message: string) => {
  const criticalEmbed = new EmbedBuilder()
    .setTitle('Critical Alert')
    .setDescription(message)
    .setColor(16057091) // RED
    .setTimestamp(Date.now());
  return logToDiscord(criticalEmbed, '@everyone');
};

export const custom = (
  builder: (embed: EmbedBuilder) => EmbedBuilder,
  content: string | null = null
) => {
  const embedBuilder = builder(new EmbedBuilder());
  return logToDiscord(embedBuilder, content);
};

export const discord = {
  info,
  alert,
  critical,
  custom
};
