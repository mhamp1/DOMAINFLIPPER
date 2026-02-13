/**
 * Domain For-Sale Lander — serves a professional buy page for any domain pointed to Vercel.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function env(key: string): string { return process.env[key] || '' }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = (req.headers.host || '').toLowerCase().replace('www.', '')
  if (host.includes('vercel.app') || host.includes('domainflipper') || host.includes('localhost')) return res.status(404).json({ error: 'Not a listed domain' })

  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return res.status(500).send('Configuration error')
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const userId = env('BOT_USER_ID')

  if (req.method === 'POST') {
    try {
      const { name, email, offer, message } = req.body || {}
      if (!email || !offer) return res.status(400).json({ error: 'Email and offer required' })
      await supabase.from('domain_offers').insert({ user_id: userId, domain: host, buyer_name: name || 'Anonymous', buyer_email: email, offer_amount: parseFloat(offer) || 0, message: message || '', source: 'lander', status: 'pending' })
      await supabase.from('bot_logs').insert({ user_id: userId, event_type: 'info', message: `LANDER OFFER: ${host} — $${offer} from ${email}`, domain: host, details: { name, email, offer: parseFloat(offer), source: 'lander' } })
      return res.status(200).json({ success: true, message: 'Offer received! We will respond within 24 hours.' })
    } catch { return res.status(500).json({ error: 'Failed to submit offer' }) }
  }

  const { data: d } = await supabase.from('owned_domains').select('*').eq('user_id', userId).eq('domain', host).in('status', ['owned', 'listed']).single()
  if (d) await supabase.from('owned_domains').update({ pageviews: (d.pageviews || 0) + 1 }).eq('id', d.id)

  const price = d?.listed_price || d?.current_value || 0
  const minOffer = d?.floor_price || Math.round(price * 0.5) || 100
  const sld = host.split('.')[0], tld = host.split('.').pop() || ''

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${host} is for sale</title><meta name="description" content="${host} is a premium domain available for purchase.${price ? ' Buy now for $' + price.toLocaleString() + '.' : ' Make an offer.'}"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#0a0a1a,#1a1a3e,#0a0a2e);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center}.c{max-width:600px;width:90%;text-align:center;padding:40px 20px}.badge{display:inline-block;background:rgba(255,255,255,.1);padding:6px 16px;border-radius:20px;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin-bottom:24px}.domain{font-size:clamp(28px,6vw,52px);font-weight:800;letter-spacing:-1px;background:linear-gradient(90deg,#60a5fa,#a78bfa,#60a5fa);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:s 3s linear infinite;margin-bottom:12px}@keyframes s{0%{background-position:0% center}100%{background-position:200% center}}.price{font-size:36px;font-weight:700;color:#34d399;margin:20px 0 4px}.pl{font-size:14px;color:rgba(255,255,255,.5);margin-bottom:20px}.stats{display:flex;gap:32px;justify-content:center;margin:24px 0}.stat{display:flex;flex-direction:column}.sv{font-size:24px;font-weight:700}.sl{font-size:12px;color:rgba(255,255,255,.5)}.btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:24px 0}.btn{padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;text-decoration:none;cursor:pointer;border:none;transition:all .2s}.bp{background:#34d399;color:#0a0a1a}.bp:hover{background:#6ee7b7;transform:translateY(-2px)}.bs{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2)}.bs:hover{background:rgba(255,255,255,.2)}.div{height:1px;background:rgba(255,255,255,.1);margin:32px 0}.of{text-align:left}.of h3{font-size:18px;margin-bottom:16px}.fg{margin-bottom:12px}.fg label{display:block;font-size:13px;color:rgba(255,255,255,.6);margin-bottom:4px}.fg input,.fg textarea{width:100%;padding:10px 14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:6px;color:#fff;font-size:15px;outline:none}.fg input:focus,.fg textarea:focus{border-color:#60a5fa}.fg textarea{resize:vertical;min-height:60px}.fr{display:grid;grid-template-columns:1fr 1fr;gap:12px}#r{margin-top:12px;padding:10px;border-radius:6px;display:none}.ok{background:rgba(52,211,153,.15);color:#34d399;display:block!important}.er{background:rgba(239,68,68,.15);color:#ef4444;display:block!important}.ft{margin-top:40px;font-size:12px;color:rgba(255,255,255,.3)}</style></head><body><div class="c"><div class="badge">Premium Domain</div><div class="domain">${host}</div>${price ? `<div class="price">$${price.toLocaleString()}</div><div class="pl">Buy It Now</div>` : '<div class="price">Make an Offer</div>'}<div class="stats"><div class="stat"><span class="sv">.${tld}</span><span class="sl">Extension</span></div><div class="stat"><span class="sv">${sld.length}</span><span class="sl">Characters</span></div></div><div class="btns">${price ? `<a href="https://www.afternic.com/domain/${host}" class="btn bp" target="_blank">Buy Now — $${price.toLocaleString()}</a>` : ''}<a href="https://dan.com/buy-domain/${host}" class="btn bs" target="_blank">View on Dan.com</a></div><div class="div"></div><div class="of"><h3>Make an Offer</h3><form id="f" onsubmit="go(event)"><div class="fr"><div class="fg"><label>Your Name</label><input type="text" name="name" placeholder="John Smith"></div><div class="fg"><label>Email *</label><input type="email" name="email" required placeholder="you@company.com"></div></div><div class="fr"><div class="fg"><label>Your Offer (USD) *</label><input type="number" name="offer" required min="${minOffer}" placeholder="${minOffer}"></div><div class="fg"><label>&nbsp;</label><button type="submit" class="btn bp" style="width:100%;padding:10px;">Submit Offer</button></div></div><div class="fg"><label>Message (optional)</label><textarea name="message" placeholder="Tell us about your project..."></textarea></div></form><div id="r"></div></div><div class="ft">This domain is professionally managed and available for immediate transfer.</div></div><script>async function go(e){e.preventDefault();const f=e.target,d=Object.fromEntries(new FormData(f)),r=document.getElementById('r');try{const x=await fetch('/api/lander',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});const j=await x.json();if(x.ok){r.className='ok';r.textContent='Offer submitted! We\\'ll respond within 24 hours.';f.reset()}else{r.className='er';r.textContent=j.error||'Something went wrong.'}}catch{r.className='er';r.textContent='Network error. Please try again.'}}</script></body></html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.status(200).send(html)
}
