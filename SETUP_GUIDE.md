# 🚀 DomainFlipper Setup Guide

Complete guide to setting up your autonomous domain flipping empire.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [API Configuration](#api-configuration)
4. [Environment Variables](#environment-variables)
5. [Deployment](#deployment)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** 18+ (Download from https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

### Required API Accounts

#### Essential (for core functionality):
1. **GoDaddy Developer Account**
   - Sign up: https://developer.godaddy.com/
   - Get API keys: https://developer.godaddy.com/keys
   - Cost: Free tier available

2. **Namecheap API Account**
   - Requirements: 
     - $50+ account balance OR
     - 20+ domains in account
   - Enable API: https://ap.www.namecheap.com/settings/tools/apiaccess/
   - Important: You must whitelist your IP address
   - Cost: Free with requirements met

3. **Supabase Account** (Database)
   - Sign up: https://supabase.com
   - Create a new project
   - Get URL and anon key from project settings
   - Cost: Free tier (500MB database, 50k monthly active users)

#### Optional (for enhanced features):
- **DropCatch** - Drop-catching service
- **ExpiredDomains.net via Apify** - Expired domain scanning
- **USPTO** - Trademark detection (often free)
- **Google APIs** - Trends data
- **Ahrefs** - SEO metrics
- **EstiBot** - Domain appraisals

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/mhamp1/DOMAINFLIPPER.git
cd DOMAINFLIPPER
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

**Note**: The `--legacy-peer-deps` flag resolves peer dependency conflicts.

### 3. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env.local

# Edit with your API credentials
nano .env.local  # or use your preferred editor
```

---

## API Configuration

### GoDaddy Setup

1. Go to https://developer.godaddy.com/keys
2. Click "Create New API Key"
3. Name it "DomainFlipper Production"
4. Choose "Production" environment
5. Copy the API Key and API Secret
6. Add to `.env.local`:
   ```
   VITE_GODADDY_API_KEY=your_key_here
   VITE_GODADDY_API_SECRET=your_secret_here
   ```

### Namecheap Setup

1. Ensure you meet requirements:
   - $50+ balance OR
   - 20+ domains in account
2. Go to https://ap.www.namecheap.com/settings/tools/apiaccess/
3. Enable API access
4. Note your API key
5. **Important**: Whitelist your IP address in the API Access page
6. Add to `.env.local`:
   ```
   VITE_NAMECHEAP_API_USER=your_username
   VITE_NAMECHEAP_API_KEY=your_api_key
   VITE_NAMECHEAP_CLIENT_IP=your_whitelisted_ip
   ```

### Supabase Setup

1. Go to https://supabase.com and create account
2. Create a new project
3. Wait for project to finish setting up (2-3 minutes)
4. Go to Project Settings → API
5. Copy:
   - Project URL
   - `anon` `public` key (NOT the service_role key!)
6. Add to `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

7. Run the database schema:
   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `supabase/schema.sql`
   - Run the SQL
   - Verify tables were created in Database → Tables

### Registrant Information

For domain registration, configure your contact details:

```env
VITE_REGISTRANT_FIRST_NAME=John
VITE_REGISTRANT_LAST_NAME=Doe
VITE_REGISTRANT_EMAIL=john@example.com
VITE_REGISTRANT_PHONE=+1.3105551234
VITE_REGISTRANT_ADDRESS=123 Main St
VITE_REGISTRANT_CITY=Los Angeles
VITE_REGISTRANT_STATE=CA
VITE_REGISTRANT_POSTAL=90001
VITE_REGISTRANT_COUNTRY=US
```

---

## Environment Variables

### Complete .env.local Template

```bash
# ===== DATABASE (Required) =====
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# ===== DOMAIN REGISTRARS (Required) =====
VITE_GODADDY_API_KEY=your_key
VITE_GODADDY_API_SECRET=your_secret
VITE_NAMECHEAP_API_USER=your_username
VITE_NAMECHEAP_API_KEY=your_key
VITE_NAMECHEAP_CLIENT_IP=your_ip

# ===== REGISTRANT INFO (Required for purchases) =====
VITE_REGISTRANT_FIRST_NAME=Your-Name
VITE_REGISTRANT_LAST_NAME=Your-LastName
VITE_REGISTRANT_EMAIL=your@email.com
VITE_REGISTRANT_PHONE=+1.5555555555
VITE_REGISTRANT_ADDRESS=123 Main St
VITE_REGISTRANT_CITY=Your-City
VITE_REGISTRANT_STATE=CA
VITE_REGISTRANT_POSTAL=12345
VITE_REGISTRANT_COUNTRY=US

# ===== OPTIONAL APIS =====
VITE_DROPCATCH_API_KEY=your_key
VITE_DROPCATCH_API_SECRET=your_secret
VITE_USPTO_API_KEY=
VITE_GOOGLE_API_KEY=your_key
VITE_AHREFS_API_KEY=your_key
VITE_APIFY_TOKEN=your_token
```

---

## Deployment

### Local Development

```bash
# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Deploy to Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

4. Set environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from your `.env.local`
   - **Never commit** `.env.local` to git!

5. Redeploy to apply changes

### Deploy to Netlify

1. Build the project:
   ```bash
   npm run build
   ```

2. Install Netlify CLI:
   ```bash
   npm i -g netlify-cli
   ```

3. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. Set environment variables:
   - Go to Site Settings → Build & Deploy → Environment
   - Add all variables from your `.env.local`

---

## Verification

### 1. Build Verification

```bash
npm run build
```

Expected output:
- ✅ No TypeScript errors
- ✅ Build completes successfully
- ✅ Bundle size shown

### 2. Test Suite

```bash
npm test
```

Expected output:
- ✅ 48+ tests passing
- ✅ No critical failures (some network tests may fail - that's OK)

### 3. API Connection Test

After starting the app:

1. Open browser to http://localhost:5173
2. Log in (use any credentials for demo)
3. Go to API Setup
4. Test each API connection
5. Verify green checkmarks for configured APIs

### 4. Autonomous Engine Test

1. Configure at least GoDaddy and Namecheap
2. Set starting capital (e.g., $500)
3. Click "Launch Empire"
4. Verify:
   - ✅ Bot status shows "Running"
   - ✅ Scanning starts
   - ✅ Stats update
   - ✅ No console errors

---

## Troubleshooting

### "API credentials not configured"

**Problem**: APIs return errors about missing credentials

**Solution**:
1. Verify `.env.local` exists and has correct values
2. Restart development server: `Ctrl+C` then `npm run dev`
3. Check variable names match exactly (case-sensitive)
4. For production, verify environment variables in deployment platform

### "Namecheap API error"

**Problem**: Namecheap API calls fail

**Solutions**:
1. **Check requirements**: $50+ balance OR 20+ domains
2. **Verify IP whitelist**: Must whitelist your exact IP
   - Get your IP: https://whatismyipaddress.com/
   - Add to Namecheap API settings
3. **Check username**: Use your Namecheap username (not email)

### "Module not found" errors

**Problem**: Import errors or missing dependencies

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### "Supabase connection failed"

**Problem**: Database operations fail

**Solutions**:
1. **Verify keys**: Check Project Settings → API in Supabase
2. **Run schema**: SQL Editor → Run `supabase/schema.sql`
3. **Check project status**: Project should be "Active"
4. **Free tier limits**: Ensure not exceeded (500MB DB, 50k MAU)

### Build warnings about chunk size

**Problem**: "Chunks larger than 500kB" warning

**Note**: This is normal for this application. The bundle includes:
- TensorFlow.js for AI
- Multiple API clients
- Rich UI components

Can be ignored unless causing performance issues.

### Rate limiting errors

**Problem**: "Rate limit exceeded" errors

**Solutions**:
1. Built-in rate limiting should prevent this
2. If it occurs, reduce `dailyScanLimit` in config
3. Wait a few minutes and try again
4. Consider upgrading API plan for higher limits

---

## Security Checklist

Before going live:

- [ ] All API credentials in `.env.local` (not in source code)
- [ ] `.env.local` in `.gitignore` (never committed)
- [ ] Using anon key for Supabase (NOT service key)
- [ ] Stripe in test mode or proper live keys
- [ ] IP whitelisting configured (Namecheap)
- [ ] Strong authentication configured
- [ ] Rate limits reasonable
- [ ] Budget limits set appropriately
- [ ] Monitoring enabled

---

## Getting Help

- **Issues**: https://github.com/mhamp1/DOMAINFLIPPER/issues
- **Discussions**: https://github.com/mhamp1/DOMAINFLIPPER/discussions
- **Security**: See SECURITY.md

---

## Next Steps

1. Complete API configuration
2. Run verification tests
3. Set your budget and strategy
4. Launch the autonomous engine
5. Monitor performance and optimize

**Start small** with a limited budget ($100-500) to test the system before scaling up.

Good luck building your domain empire! 🚀💎
