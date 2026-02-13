/**
 * Notification helper — sends alerts to Discord/Slack webhook.
 * Does NOT throw on failure — notifications are fire-and-forget.
 */

export async function notify(
  webhookUrl: string | null | undefined,
  event: string,
  details: Record<string, any>,
  severity: 'info' | 'warning' | 'critical' = 'info'
): Promise<void> {
  if (!webhookUrl) return

  const emoji = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️'
  const color = severity === 'critical' ? 0xff0000 : severity === 'warning' ? 0xffa500 : 0x00ff00

  try {
    // Try Discord embed format first
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: null,
        embeds: [{
          title: `${emoji} ${event}`,
          description: Object.entries(details)
            .map(([k, v]) => `**${k}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
            .join('\n'),
          color,
          timestamp: new Date().toISOString(),
          footer: { text: 'Domain Flipper Bot' },
        }],
      }),
    })
  } catch {
    // Try plain Slack format as fallback
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${emoji} *${event}*\n${Object.entries(details).map(([k, v]) => `• ${k}: ${v}`).join('\n')}`,
        }),
      })
    } catch {
      // Notification failure should never break the pipeline
      console.error('[Notify] Failed to send notification')
    }
  }
}
