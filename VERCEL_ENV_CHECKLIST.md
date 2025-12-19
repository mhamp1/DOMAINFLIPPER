# 🔐 VERCEL ENVIRONMENT VARIABLES CHECKLIST — DomainFlipper

**Last Updated:** December 7, 2025  
**Purpose:** Complete checklist of all environment variables needed for DomainFlipper production deployment

---

## ✅ VARIABLES YOU ALREADY HAVE (From Vercel)

These are already configured from your other project and work for DomainFlipper:

| Variable | Status | Notes |
|----------|--------|-------|
| `VITE_SUPABASE_URL` | ✅ Ready | `https://lujlicopqtndvlkdgvgq.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ Ready | Public anon key for client-side |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Ready | Server-side only (do NOT use VITE_ prefix) |
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ Ready | For authentication |
| `CLERK_SECRET_KEY` | ✅ Ready | Server-side only |
| `STRIPE_SECRET_KEY` | ✅ Ready | For payments |
| `STRIPE_WEBHOOK_SECRET` | ✅ Ready | Webhook verification |
| `VITE_STRIPE_*_PRICE_ID` | ✅ Ready | Pricing tiers |
| `RESEND_API_KEY` | ✅ Ready | Email sending |
| `VITE_HELIUS_API_KEY` | ✅ Ready | Solana RPC (optional) |
| `VITE_XAI_API_KEY` | ✅ Ready | AI features (optional) |
| `VITE_APP_ENV` | ✅ Ready | `production` |
| `VITE_APP_URL` | ✅ Ready | Your deployment URL |

---

## 🆕 VARIABLES TO ADD FOR DOMAINFLIPPER

### 1. **ESCROW.COM** (✅ READY - You have the API key!)

```env
VITE_ESCROW_API_KEY=18398_F9B1u7NakkNxcRVfSpCYCm0glPx3NH7mE6oonUumboXsgmAmhIz7F2NKmVfCV4R3
VITE_ESCROW_EMAIL=mhamp1trading@yahoo.com
VITE_ESCROW_SANDBOX=false
```

**Status:** ✅ Ready to add to Vercel  
**Where:** Settings → Environment Variables → Add

---

### 2. **DROPCATCH** (⏳ Pending - Need to create API client)

```env
VITE_DROPCATCH_CLIENT_ID=your_client_id_here
VITE_DROPCATCH_CLIENT_SECRET=your_client_secret_here
VITE_DROPCATCH_SANDBOX=false
```

**How to get:**
1. Go to https://www.dropcatch.com
2. Login with your account
3. Navigate to **API Client Management** (Settings → API)
4. Click "Create New API Client"
5. Name it: `DomainFlipper`
6. **SAVE THE PASSWORD IMMEDIATELY** - it won't show again!
7. Copy Client ID and the password (clientSecret)

**Status:** ⏳ Waiting for you to create client  
**Note:** V2 endpoints only, OAuth2 authentication

---

### 3. **SEDO** (✅ Partner ID Ready)

```env
VITE_SEDO_PARTNER_ID=335853
VITE_SEDO_PARTNER_NAME=DomainFlipper
```

**Note:** Sedo does NOT have a public selling API. Your Partner ID is for affiliate tracking only.  
**Status:** ✅ Ready to add (affiliate tracking)

---

### 4. **GODADDY** (🔑 Need your existing keys)

```env
VITE_GODADDY_KEY=your_godaddy_api_key
VITE_GODADDY_SECRET=your_godaddy_api_secret
VITE_GODADDY_SHOPPER_ID=your_shopper_id
```

**How to get:**
1. Go to https://developer.godaddy.com
2. Login → My Account → API Keys
3. Generate Production key pair
4. Note: Requires $99/mo GoDaddy Pro for auction bidding

**Status:** 🔑 Need to add to Vercel

---

### 5. **NAMECHEAP** (🔑 Need your existing keys)

```env
VITE_NAMECHEAP_API_USER=your_username
VITE_NAMECHEAP_API_KEY=your_api_key
VITE_NAMECHEAP_CLIENT_IP=your_server_ip
```

**How to get:**
1. Go to https://www.namecheap.com
2. Profile → Tools → API Access
3. Enable API (requires $50+ account balance or purchases)
4. Whitelist your server IP (and Vercel's IP ranges for serverless)

**Status:** 🔑 Need to add to Vercel  
**Note:** For Vercel, whitelist: `76.76.21.0/24` (Vercel edge IPs)

---

### 6. **NAMEBRIGHT** (✅ APPROVED!)

```env
VITE_NAMEBRIGHT_CLIENT_ID=mhamp1:DomainFlipper
VITE_NAMEBRIGHT_CLIENT_SECRET=lv%$#e]Q9XR:i}trcPuL1shP$_Jk$>
```

**Status:** ✅ Ready to add to Vercel!  
**Account:** mhamp1trading@yahoo.com  
**Auth:** OAuth2 bearer token (30 min expiry, auto-refresh)

**⚠️ IP WHITELIST ISSUE:**  
Your current whitelist is `192.168.0.106` (private/local IP).  
For Vercel deployment, you need to whitelist Vercel's IPs or use `0.0.0.0/0` (allow all).  
Update at: https://legacy.namebright.com/Settings#Api

**Note:** NameBright API does NOT allow drop-catching (domains dropping that day show as "unavailable")

---

### 7. **USPTO TRADEMARK API** (Free)

```env
VITE_USPTO_API_KEY=your_uspto_key
```

**How to get:**
1. Go to https://developer.uspto.gov
2. Register (free)
3. Generate API key

**Status:** 🔑 Need to obtain (FREE)

---

### 8. **APIFY** (For ExpiredDomains.net scraping)

```env
VITE_APIFY_TOKEN=your_apify_token
```

**How to get:**
1. Go to https://apify.com
2. Sign up (free tier available)
3. Dashboard → Integrations → API Token

**Status:** 🔑 Optional but recommended

---

### 9. **SELLER INFORMATION** (Required for domain registration)

```env
VITE_SELLER_EMAIL=mhamp1trading@yahoo.com
VITE_SELLER_NAME=Your Name
VITE_SELLER_COMPANY=Your Company Name
VITE_SELLER_ADDRESS=Your Address
VITE_SELLER_CITY=Your City
VITE_SELLER_STATE=Your State
VITE_SELLER_ZIP=Your Postal Code
VITE_SELLER_COUNTRY=US
VITE_SELLER_PHONE=+1.5551234567
```

**Status:** 🔑 Need to add (required for domain registration/transfer)

---

## ❌ NOT AVAILABLE (No Public APIs)

| Service | Status | Alternative |
|---------|--------|-------------|
| **Afternic** | ❌ No API | Use GoDaddy integration (auto-distributes to Afternic) |
| **DAN.com** | ❌ Discontinued | Migrated to Afternic |
| **Flippa** | ❌ No API | Manual listing only |

**Account created:** mhamp1trading@yahoo.com / Tomatoes23! (Flippa/Escrow)

---

## 📋 QUICK COPY - All Variables for Vercel

Copy and add these to Vercel (Settings → Environment Variables):

```env
# ============ ESCROW.COM (READY) ============
VITE_ESCROW_API_KEY=18398_F9B1u7NakkNxcRVfSpCYCm0glPx3NH7mE6oonUumboXsgmAmhIz7F2NKmVfCV4R3
VITE_ESCROW_EMAIL=mhamp1trading@yahoo.com
VITE_ESCROW_SANDBOX=false

# ============ SEDO PARTNER (READY) ============
VITE_SEDO_PARTNER_ID=335853
VITE_SEDO_PARTNER_NAME=DomainFlipper

# ============ SELLER INFO (ADD YOUR DETAILS) ============
VITE_SELLER_EMAIL=mhamp1trading@yahoo.com
VITE_SELLER_NAME=
VITE_SELLER_COMPANY=
VITE_SELLER_ADDRESS=
VITE_SELLER_CITY=
VITE_SELLER_STATE=
VITE_SELLER_ZIP=
VITE_SELLER_COUNTRY=US
VITE_SELLER_PHONE=

# ============ DROPCATCH (WHEN READY) ============
VITE_DROPCATCH_CLIENT_ID=
VITE_DROPCATCH_CLIENT_SECRET=
VITE_DROPCATCH_SANDBOX=false

# ============ GODADDY (ADD YOUR KEYS) ============
VITE_GODADDY_KEY=
VITE_GODADDY_SECRET=
VITE_GODADDY_SHOPPER_ID=

# ============ NAMECHEAP (ADD YOUR KEYS) ============
VITE_NAMECHEAP_API_USER=
VITE_NAMECHEAP_API_KEY=
VITE_NAMECHEAP_CLIENT_IP=

# ============ USPTO (FREE - GET KEY) ============
VITE_USPTO_API_KEY=

# ============ APIFY (OPTIONAL) ============
VITE_APIFY_TOKEN=

# ============ NAMEBRIGHT (READY!) ============
VITE_NAMEBRIGHT_CLIENT_ID=mhamp1:DomainFlipper
VITE_NAMEBRIGHT_CLIENT_SECRET=lv%$#e]Q9XR:i}trcPuL1shP$_Jk$>
```

---

## 🚀 PRIORITY ORDER TO GET BOT RUNNING

1. **✅ Add Escrow.com keys NOW** (you have these!)
2. **✅ Add Sedo Partner ID NOW** (affiliate tracking)
3. **✅ Add NameBright keys NOW** (you have these!)
4. **🔑 Add GoDaddy keys** (main acquisition source)
5. **🔑 Add Namecheap keys** (secondary acquisition)
6. **⏳ Create DropCatch API client** (drop catching)
7. **🔑 Get USPTO API key** (trademark safety - FREE)

---

## 📍 HOW TO ADD TO VERCEL

1. Go to https://vercel.com/dashboard
2. Select **domainflipper** project
3. Go to **Settings** → **Environment Variables**
4. For each variable:
   - Click **Add**
   - Name: `VITE_ESCROW_API_KEY` (example)
   - Value: `your_key_here`
   - Environment: Select `Production`, `Preview`, `Development`
   - Click **Save**
5. **Redeploy** for changes to take effect:
   - Go to **Deployments** tab
   - Click **...** on latest deployment
   - Select **Redeploy**

---

## ⚠️ SECURITY NOTES

1. **Never commit API keys to git** (already in .gitignore)
2. **VITE_ prefix** = exposed to client (public keys only)
3. **No VITE_ prefix** = server-side only (secrets)
4. **Rotate keys** every 90 days
5. **Monitor usage** to detect unauthorized access

---

**Your bot is READY to make money once you add the GoDaddy/Namecheap keys for acquisition!**  
**Escrow.com is ready for secure sales immediately!**
