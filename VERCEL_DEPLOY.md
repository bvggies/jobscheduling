# Quick Vercel Deployment Guide

## Your Neon Database Connection String

```
postgresql://neondb_owner:npg_c6tLUkaby9dT@ep-cool-grass-ahisn1s9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Step-by-Step Deployment

### 1. Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository: `bvggies/jobscheduling`
4. Configure:
   - **Framework Preset**: Create React App (auto-detected)
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install` (auto-detected)

### 2. Add Environment Variables

**Before clicking Deploy**, click **"Environment Variables"** and add:

| Variable | Value | Environments |
|----------|-------|--------------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_c6tLUkaby9dT@ep-cool-grass-ahisn1s9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require` | ✅ Production<br>✅ Preview<br>✅ Development |
| `NODE_ENV` | `production` | ✅ Production only |

### 3. Deploy

Click **"Deploy"** and wait for the build to complete.

### 4. Get Your Deployment URL

After deployment completes, copy your URL:
- Example: `https://jobscheduling-app.vercel.app`

### 5. Update REACT_APP_API_URL

1. Go to **Project Settings** → **Environment Variables**
2. Add new variable:
   - `REACT_APP_API_URL`: `https://your-app.vercel.app/api`
     - Replace `your-app.vercel.app` with your actual Vercel URL
     - Environments: ✅ Production, ✅ Preview, ✅ Development
3. **Redeploy** the project (Vercel will auto-redeploy or click Redeploy)

## Verify Deployment

1. **Test Backend API:**
   - Visit: `https://your-app.vercel.app/api/health`
   - Should see: `{"status":"OK","message":"Job Scheduling API is running"}`

2. **Test Frontend:**
   - Visit: `https://your-app.vercel.app`
   - App should load

3. **Test Database:**
   - Create a machine
   - Create a job
   - Data should persist (stored in Neon)

## Important Notes

✅ **All server dependencies are in root `package.json`** - Vercel will install them automatically

✅ **Database tables auto-create** - First API request will create all tables

✅ **SSL is automatically enabled** - Backend detects Neon and enables SSL

✅ **Environment variables are encrypted** - Safe to store in Vercel

## Troubleshooting

**API routes return 404?**
- Check `vercel.json` routes configuration
- Verify `api/index.js` exists
- Check Vercel function logs

**Database connection fails?**
- Verify `DATABASE_URL` is set correctly in Vercel
- Check Neon console - database might be suspended
- Review Vercel function logs for connection errors

**Frontend can't connect to API?**
- Verify `REACT_APP_API_URL` matches your Vercel URL
- Must include `/api` at the end
- Redeploy after changing environment variables

## Your Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] `DATABASE_URL` environment variable set
- [ ] `NODE_ENV` environment variable set
- [ ] First deployment completed
- [ ] `REACT_APP_API_URL` set with your Vercel URL
- [ ] Redeployed after setting `REACT_APP_API_URL`
- [ ] Tested API health endpoint
- [ ] Tested creating a job
- [ ] Verified data persists in Neon database

## Need Help?

- Check Vercel deployment logs
- Check Vercel function logs
- See `TROUBLESHOOTING.md` for common issues
- See `DEPLOYMENT.md` for detailed instructions

