# Vercel Deployment Guide

This guide covers the Vercel deployment setup and configuration for MantisNXT.

## Overview

MantisNXT is configured to deploy directly to Vercel using:
- **Vercel CLI** for local deployments
- **GitHub Actions** for automated CI/CD deployments
- **Vercel Dashboard** for project management

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional, for local deployments):
   ```bash
   npm install -g vercel
   # or
   bun add -g vercel
   ```

3. **GitHub Integration**: Connect your GitHub repository to Vercel

## Configuration Files

### `vercel.json`

The project includes a `vercel.json` configuration file that:
- Configures Next.js framework detection
- Sets build commands using Bun
- Configures API route timeouts (5 minutes max)
- Sets up proper headers and rewrites
- Configures deployment regions (iad1 - US East)

### `.vercelignore`

Files and directories excluded from Vercel deployments:
- `node_modules`
- `build`, `dist`
- `.git`
- Log files

## Environment Variables

Required environment variables must be set in the Vercel Dashboard:

**Project Settings → Environment Variables**

### Required Variables

```env
# Database
DATABASE_URL=postgresql://...
NEON_DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.vercel.app

# Clerk (if using)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### Optional Variables

```env
# AI Providers
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
VERCEL_AI_GATEWAY_URL=...
VERCEL_AI_GATEWAY_TOKEN=...

# Monitoring
SLACK_WEBHOOK_URL=...

# Redis (if using)
REDIS_URL=redis://...
```

## Deployment Methods

### Method 1: GitHub Integration (Recommended)

1. **Connect Repository**:
   - Go to Vercel Dashboard → Add New Project
   - Import your GitHub repository
   - Configure project settings

2. **Automatic Deployments**:
   - Every push to `main` branch → Production deployment
   - Pull requests → Preview deployments
   - Configured via GitHub Actions workflow

3. **Manual Deployment**:
   ```bash
   # Via GitHub Actions
   gh workflow run deployment.yml
   ```

### Method 2: Vercel CLI

1. **Login**:
   ```bash
   vercel login
   ```

2. **Link Project**:
   ```bash
   vercel link
   ```
   This will prompt for:
   - Vercel organization
   - Project name
   - Directory

3. **Deploy**:
   ```bash
   # Preview deployment
   vercel

   # Production deployment
   vercel --prod
   ```

### Method 3: GitHub Actions (CI/CD)

The project includes a GitHub Actions workflow (`.github/workflows/deployment.yml`) that:
- Runs pre-deployment checks
- Executes test suite
- Creates database backups
- Runs migrations
- Deploys to Vercel
- Validates deployment

**Required GitHub Secrets**:
- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `PRODUCTION_DATABASE_URL` - Database connection string
- `JWT_SECRET` - JWT signing secret

## Build Configuration

### Package Manager

The project uses **Bun** as the primary package manager:
- `packageManager: "bun@latest"` in `package.json`
- Build command: `bun run build`
- Install command: `bun install`

**Note**: Vercel supports Bun natively. The `vercel.json` is configured to use Bun commands.

### Build Process

1. **Install Dependencies**: `bun install`
2. **Build Application**: `bun next build --webpack`
3. **Output**: `.next` directory

### Build Settings in Vercel Dashboard

Ensure these settings match:
- **Framework Preset**: Next.js
- **Build Command**: `bun run build` (or leave empty for auto-detection)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `bun install` (or leave empty for auto-detection)
- **Node.js Version**: 18.x or higher

## API Route Configuration

API routes are configured with extended timeouts for long-running operations:

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 300
    }
  }
}
```

This allows API routes to run for up to 5 minutes (Vercel Pro plan required for > 10 seconds).

## Headers and Rewrites

### Headers

- `/api/health` - No-cache headers
- `/uploads/:path*` - Long-term caching
- `/_next/static/css/:path*` - Proper Content-Type headers

### Rewrites

- `/api/metrics` → `/api/monitoring/metrics`

## Troubleshooting

### Build Failures

1. **Check Build Logs**:
   - Vercel Dashboard → Deployments → Select deployment → View logs

2. **Common Issues**:
   - Missing environment variables
   - TypeScript errors (check `next.config.js` - `ignoreBuildErrors: true`)
   - Dependency conflicts
   - Memory limits

3. **Local Build Test**:
   ```bash
   bun run build
   ```

### Deployment Not Triggering

1. **Check Git Integration**:
   - Vercel Dashboard → Project Settings → Git
   - Verify repository connection
   - Check branch settings

2. **Verify GitHub Actions**:
   - GitHub → Actions tab
   - Check workflow runs
   - Review logs

3. **Check Commit Author**:
   - Git email must match Vercel account email
   ```bash
   git config user.email
   ```

### Environment Variables Not Loading

1. **Check Variable Names**: Case-sensitive
2. **Verify Scope**: Production, Preview, or Development
3. **Redeploy**: Variables require redeployment to take effect

### Function Timeout Errors

- Check `vercel.json` function configuration
- Verify Vercel plan supports extended timeouts (Pro plan)
- Optimize long-running operations

## Monitoring and Logs

### Vercel Dashboard

- **Deployments**: View all deployments and their status
- **Logs**: Real-time function logs
- **Analytics**: Performance metrics (Pro plan)
- **Speed Insights**: Core Web Vitals (Pro plan)

### CLI Logs

```bash
# View deployment logs
vercel logs [deployment-url]

# Follow logs in real-time
vercel logs --follow
```

## Rollback

### Via Vercel Dashboard

1. Go to Deployments
2. Find previous successful deployment
3. Click "..." → Promote to Production

### Via CLI

```bash
vercel rollback [deployment-url]
```

### Via GitHub Actions

The workflow includes a rollback job that can be triggered manually.

## Best Practices

1. **Environment Variables**:
   - Never commit secrets to repository
   - Use Vercel Dashboard for sensitive values
   - Use different values for Production/Preview/Development

2. **Build Optimization**:
   - Keep dependencies minimal
   - Use dynamic imports for large libraries
   - Optimize images (Next.js Image component)

3. **Monitoring**:
   - Set up error tracking (Sentry, etc.)
   - Monitor function execution times
   - Track API response times

4. **Security**:
   - Enable Vercel Security Headers
   - Use HTTPS only
   - Implement rate limiting
   - Validate all inputs

## Support

- **Vercel Documentation**: https://vercel.com/docs
- **Vercel Support**: support@vercel.com
- **GitHub Issues**: Create an issue in the repository

## Related Documentation

- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
- [Deployment System](DEPLOYMENT_SYSTEM.md)
- [GitHub Actions Workflow](.github/workflows/deployment.yml)

