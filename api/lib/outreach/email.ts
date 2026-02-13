/**
 * Email sender via Resend.com
 */
interface EmailResult { success: boolean; messageId?: string; error?: string }

export async function sendEmail(options: { to: string; subject: string; html: string }): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { success: false, error: 'RESEND_API_KEY not configured' }
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const replyTo = process.env.RESEND_REPLY_TO || from
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [options.to], subject: options.subject, html: options.html, reply_to: replyTo }),
    })
    if (!r.ok) return { success: false, error: `Resend ${r.status}: ${(await r.text()).slice(0, 200)}` }
    const data = await r.json()
    return { success: true, messageId: data.id }
  } catch (e) { return { success: false, error: (e as Error).message } }
}

export async function sendOfferResponse(buyerEmail: string, buyerName: string, domain: string, action: 'accept' | 'counter' | 'decline', offerAmount: number, counterAmount?: number, listPrice?: number): Promise<EmailResult> {
  const seller = process.env.SELLER_DISPLAY_NAME || 'Domain Sales'
  const address = process.env.SELLER_ADDRESS || ''
  const afternicUrl = `https://www.afternic.com/domain/${domain}`
  const danUrl = `https://dan.com/buy-domain/${domain}`
  let subject: string, body: string

  if (action === 'accept') {
    subject = `Offer Accepted — ${domain}`
    body = `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#d4d4d8;background:#09090b;padding:40px;border-radius:12px;"><div style="text-align:center;margin-bottom:24px;"><span style="background:rgba(52,211,153,0.12);color:#34d399;padding:6px 20px;border-radius:100px;font-size:13px;font-weight:600;">OFFER ACCEPTED</span></div><div style="text-align:center;margin-bottom:8px;"><span style="font-size:28px;font-weight:800;color:#fff;">${domain}</span></div><div style="text-align:center;margin-bottom:24px;"><span style="font-size:24px;font-weight:700;color:#34d399;">$${offerAmount.toLocaleString()}</span></div><p>Hi ${buyerName},</p><p>Your offer of <strong style="color:#fff;">$${offerAmount.toLocaleString()}</strong> for <strong style="color:#fff;">${domain}</strong> has been accepted.</p><p>Complete the purchase securely:</p><div style="text-align:center;margin:24px 0;"><a href="${afternicUrl}" style="display:inline-block;background:#34d399;color:#09090b;padding:14px 36px;border-radius:8px;font-weight:700;text-decoration:none;">Buy on Afternic</a> <a href="${danUrl}" style="display:inline-block;background:#27272a;color:#fff;padding:14px 36px;border-radius:8px;font-weight:600;text-decoration:none;margin-left:8px;">Dan.com</a></div><p style="color:#52525b;font-size:12px;">${address}</p></div>`
  } else if (action === 'counter') {
    subject = `Counter Offer — ${domain}`
    body = `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#d4d4d8;background:#09090b;padding:40px;border-radius:12px;"><div style="text-align:center;margin-bottom:24px;"><span style="background:rgba(234,179,8,0.12);color:#eab308;padding:6px 20px;border-radius:100px;font-size:13px;font-weight:600;">COUNTER OFFER</span></div><div style="text-align:center;margin-bottom:24px;"><span style="font-size:28px;font-weight:800;color:#fff;">${domain}</span></div><div style="text-align:center;margin-bottom:24px;"><span style="color:#71717a;text-decoration:line-through;">$${offerAmount.toLocaleString()}</span> <span style="color:#eab308;font-size:20px;font-weight:700;margin-left:12px;">→ $${(counterAmount||0).toLocaleString()}</span></div><p>Hi ${buyerName},</p><p>Thank you for your interest in <strong style="color:#fff;">${domain}</strong>. After review, I'd like to counter at <strong style="color:#eab308;">$${(counterAmount||0).toLocaleString()}</strong>.</p>${listPrice ? `<p>Listed at $${listPrice.toLocaleString()}, this counter is a meaningful discount.</p>` : ''}<div style="text-align:center;margin:24px 0;"><a href="${afternicUrl}" style="display:inline-block;background:#eab308;color:#09090b;padding:14px 36px;border-radius:8px;font-weight:700;text-decoration:none;">Accept — $${(counterAmount||0).toLocaleString()}</a></div><p style="color:#71717a;font-size:13px;">Or reply with a revised offer.</p><p style="color:#52525b;font-size:12px;">${address}</p></div>`
  } else {
    subject = `Re: Your Offer on ${domain}`
    body = `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#d4d4d8;background:#09090b;padding:40px;border-radius:12px;"><div style="text-align:center;margin-bottom:24px;"><span style="font-size:28px;font-weight:800;color:#fff;">${domain}</span></div><p>Hi ${buyerName},</p><p>Thank you for your interest in <strong style="color:#fff;">${domain}</strong>. Unfortunately, $${offerAmount.toLocaleString()} is below what I can accept.</p>${listPrice ? `<p>The domain is available for <strong style="color:#fff;">$${listPrice.toLocaleString()}</strong>.</p>` : ''}<div style="text-align:center;margin:24px 0;"><a href="${afternicUrl}" style="display:inline-block;background:#3f3f46;color:#fff;padding:14px 36px;border-radius:8px;font-weight:700;text-decoration:none;">View Listing</a></div><p style="color:#71717a;font-size:13px;">Feel free to reply with a revised offer.</p><p style="color:#52525b;font-size:12px;">${address}</p></div>`
  }
  return sendEmail({ to: buyerEmail, subject, html: body })
}
