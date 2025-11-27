# Deployment Guide - Vercel + Neon DB

This guide will help you deploy the JobScheduler application to Vercel with Neon PostgreSQL database.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Neon PostgreSQL database account (free tier works)
- Node.js installed locally (for testing)

## Step 1: Set Up Neon PostgreSQL Database

✅ **Your Neon database is already set up!**

Your connection string:
```
postgresql://neondb_owner:npg_c6tLUkaby9dT@ep-cool-grass-ahisn1s9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Note:** This connection string is already configured and ready to use in Vercel.

## Step 2: Prepare Your Code

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./` (leave as root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install` (Vercel will auto-detect)

5. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add the following:
     - `DATABASE_URL`: `postgresql://neondb_owner:npg_c6tLUkaby9dT@ep-cool-grass-ahisn1s9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require`
       - Environment: **Production, Preview, Development** (select all)
     - `NODE_ENV`: `production`
       - Environment: **Production**
     - `REACT_APP_API_URL`: Leave empty for now (we'll set it after first deploy)

6. Click "Deploy"

7. **After first deployment**, copy your Vercel deployment URL (e.g., `https://your-app.vercel.app`)

8. **Update Environment Variables**:
   - Go back to Project Settings → Environment Variables
   - Update `REACT_APP_API_URL` to: `https://your-app.vercel.app/api`
   - Redeploy the project

### Option B: Deploy via Vercel CLI

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
   vercel
   ```

4. Follow the prompts and add environment variables when asked

5. Set environment variables:
   ```bash
   vercel env add DATABASE_URL
   vercel env add NODE_ENV
   vercel env add REACT_APP_API_URL
   ```

6. Deploy to production:
   ```bash
   vercel --prod
   ```

## Step 4: Configure Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | Your Neon connection string | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |
| `REACT_APP_API_URL` | `https://your-app.vercel.app/api` | Production, Preview, Development |

**Important**: After adding `REACT_APP_API_URL`, you need to redeploy for it to take effect.

## Step 5: Verify Deployment

1. **Check Backend API**:
   - Visit: `https://your-app.vercel.app/api/health`
   - You should see: `{"status":"OK","message":"Job Scheduling API is running"}`

2. **Check Frontend**:
   - Visit: `https://your-app.vercel.app`
   - The app should load

3. **Test Database Connection**:
   - Create a machine in the app
   - Create a job
   - Check if data persists

## How It Works

- **Frontend**: Served as static files from Vercel's CDN
- **Backend API**: Runs as serverless functions at `/api/*` routes
- **Database**: Neon PostgreSQL (serverless, auto-scaling)

## Local Development

For local development, you can still run both frontend and backend:

1. **Start Backend** (Terminal 1):
   ```bash
   cd server
   npm install
   npm start
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   npm install
   npm start
   ```

3. **Set up local environment variables**:
   - Create `.env` in root: `REACT_APP_API_URL=http://localhost:5000/api`
   - Create `server/.env`: `DATABASE_URL=your_neon_connection_string`

## Troubleshooting

### Database Connection Issues

**Error**: "Connection timeout" or "Connection refused"
- **Solution**: 
  - Verify your `DATABASE_URL` is correct
  - Check if SSL mode is required (add `?sslmode=require` if needed)
  - In Neon Console, go to Settings → IP Allowlist and ensure "Allow all IPs" is enabled

### API Routes Not Working

**Error**: 404 on `/api/*` routes
- **Solution**:
  - Check `vercel.json` configuration
  - Ensure `api/index.js` exists
  - Verify build completed successfully
  - Check Vercel function logs

### Environment Variables Not Working

**Error**: `REACT_APP_API_URL` is undefined
- **Solution**:
  - Environment variables starting with `REACT_APP_` need to be set in Vercel
  - After adding/updating, **redeploy** the project
  - Check Vercel deployment logs for errors

### Build Failures

**Error**: Build fails during deployment
- **Solution**:
  - Check Node.js version (Vercel uses Node 18.x by default)
  - Verify all dependencies are in `package.json`
  - Check build logs in Vercel dashboard
  - Ensure `server/` directory and files are committed to Git

### CORS Issues

**Error**: CORS errors in browser console
- **Solution**:
  - The backend is configured to allow all origins in production
  - If issues persist, check `server/index.js` CORS configuration
  - Verify API URL matches your Vercel deployment URL

## Database Initialization

The database tables are automatically created on the first API request. You don't need to run any migration scripts.

## Monitoring

- **Vercel Dashboard**: View deployment logs, function logs, and analytics
- **Neon Console**: Monitor database connections, queries, and usage
- **Vercel Analytics**: Enable in project settings for performance monitoring

## Cost Considerations

### Vercel (Free Tier)
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Serverless functions included
- ✅ Automatic HTTPS

### Neon (Free Tier)
- ✅ 0.5 GB storage
- ✅ Unlimited projects
- ✅ Auto-suspend after 5 minutes of inactivity
- ✅ Auto-resume on first request

**Note**: For production use, consider upgrading to paid tiers for better performance and no auto-suspend.

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use Vercel Environment Variables** - Secure and encrypted
3. **Enable Vercel Authentication** - Optional, for team access
4. **Regular Updates** - Keep dependencies updated
5. **Database Security** - Use strong passwords, enable SSL

## Next Steps

- Set up custom domain (optional)
- Enable Vercel Analytics
- Configure automatic deployments from GitHub
- Set up monitoring and alerts
- Consider upgrading to paid tiers for production

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
