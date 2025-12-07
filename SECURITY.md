# 🔒 Security Policy

## ⚠️ CRITICAL: Exposed Credentials in Git History

**IMPORTANT**: This repository previously contained hardcoded API credentials in the source code (commits before this security fix). If you cloned this repository before the security fix, you MUST:

1. **IMMEDIATELY REVOKE ALL EXPOSED CREDENTIALS**
2. Generate new API keys for all services
3. Configure them via environment variables (see below)

### Exposed Credentials That Must Be Revoked

The following credentials were exposed in git history and MUST be regenerated:

- ✅ GoDaddy API keys (regenerated)
- ✅ Namecheap API keys (regenerated)  
- ✅ **Stripe Live Keys** (CRITICAL - can process payments!)
- ✅ Supabase keys (both anon and service keys)
- ✅ Google API keys
- ✅ Twitter/X API credentials
- ✅ USPTO API keys
- ✅ Infura & Alchemy Web3 API keys

## Security Best Practices

### 1. Never Commit Credentials

- **NEVER** hardcode API keys, secrets, or passwords in source code
- Always use environment variables for sensitive data
- Use `.env.local` for local development (gitignored)
- Use deployment platform's secrets management for production

### 2. Environment Variables

All API credentials MUST be provided via environment variables:

```bash
# Copy the example file
cp .env.example .env.local

# Edit with your credentials
nano .env.local
```

See `.env.example` for all required environment variables.

### 3. .gitignore Configuration

Ensure these files are NEVER committed:

```
.env
.env.local
.env.*.local
*.key
*.pem
credentials.json
secrets.json
```

### 4. Pre-commit Hooks

Consider adding pre-commit hooks to scan for credentials:

```bash
npm install --save-dev git-secrets
git secrets --install
git secrets --register-aws
```

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please:

1. **DO NOT** open a public issue
2. Email the maintainers directly at: [security@domainflipper.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work to resolve the issue promptly.

## Secure Configuration Checklist

Before deploying to production:

- [ ] All credentials removed from source code
- [ ] Environment variables configured
- [ ] .env files in .gitignore
- [ ] API keys rotated if previously exposed
- [ ] Stripe in test mode or proper live keys
- [ ] Supabase RLS policies enabled
- [ ] Rate limiting configured
- [ ] Error messages don't expose sensitive data
- [ ] HTTPS enforced
- [ ] Authentication properly configured
- [ ] Database backups enabled
- [ ] Monitoring and alerting set up

## API Key Security

### Critical APIs (Require Immediate Rotation if Exposed)

1. **Stripe** - Can process real payments
2. **Supabase Service Key** - Full database access
3. **GoDaddy/Namecheap** - Can register domains and make purchases

### How to Rotate Keys

#### Stripe
1. Go to https://dashboard.stripe.com/apikeys
2. Click "Delete" on compromised key
3. Generate new key
4. Update environment variables
5. Redeploy application

#### Supabase
1. Go to https://app.supabase.com/project/_/settings/api
2. Click "Reset" on compromised keys
3. Update environment variables
4. Redeploy application

#### GoDaddy
1. Go to https://developer.godaddy.com/keys
2. Delete compromised key
3. Create new key
4. Update environment variables

#### Namecheap
1. Go to https://ap.www.namecheap.com/settings/tools/apiaccess/
2. Regenerate API key
3. Update environment variables

## License

Security policy is part of the main project license.
