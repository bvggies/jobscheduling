# Vercel + Neon DB Setup Summary

This application is configured to run entirely on **Vercel** (frontend + backend) with **Neon PostgreSQL** database.

## Architecture

```
┌─────────────────┐
│   Vercel CDN    │  ← Serves React frontend (static files)
└─────────────────┘
         │
         │ API calls to /api/*
         ▼
┌─────────────────┐
│ Vercel Serverless│  ← Express.js backend as serverless functions
│    Functions     │
└─────────────────┘
         │
         │ Database queries
         ▼
┌─────────────────┐
│  Neon PostgreSQL │  ← Serverless PostgreSQL database
└─────────────────┘
```

## Key Files

### `vercel.json`
- Routes `/api/*` to serverless functions
- Serves React app for all other routes
- Configures caching headers

### `api/index.js`
- Entry point for Vercel serverless functions
- Exports Express app

### `server/index.js`
- Express app configured for both local dev and serverless
- Auto-initializes database on first request
- Handles CORS for production

### `server/config/database.js`
- Optimized for serverless (connection pooling)
- Auto-creates tables on first connection

## Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `NODE_ENV` | Environment | `production` |
| `REACT_APP_API_URL` | Frontend API URL | `https://your-app.vercel.app/api` |

## Deployment Flow

1. **Push to GitHub** → Vercel auto-deploys
2. **First Request** → Database tables auto-created
3. **API Routes** → Handled by serverless functions
4. **Static Files** → Served from Vercel CDN

## Benefits

✅ **Single Platform**: Everything on Vercel  
✅ **Auto-scaling**: Serverless functions scale automatically  
✅ **Global CDN**: Fast static file delivery  
✅ **Zero Config**: Works out of the box  
✅ **Free Tier**: Generous free limits  
✅ **HTTPS**: Automatic SSL certificates  

## Local Development

Still works the same:
- Frontend: `npm start` (port 3000)
- Backend: `cd server && npm start` (port 5000)
- Database: Uses same Neon connection string

## Important Notes

1. **Database Connection**: Neon auto-suspends after 5 min inactivity, auto-resumes on first request
2. **Cold Starts**: First request after inactivity may be slower (~1-2 seconds)
3. **Environment Variables**: Must be set in Vercel dashboard, not in code
4. **REACT_APP_API_URL**: Set after first deploy (you need the deployment URL first)

## Troubleshooting

**Cold Start Delays?**
- Normal for serverless - first request after inactivity takes longer
- Consider upgrading to Vercel Pro for better performance

**Database Timeouts?**
- Check Neon connection string includes `?sslmode=require`
- Verify Neon project is active (not suspended)
- Check Vercel function logs for connection errors

**API Routes 404?**
- Verify `vercel.json` routes are correct
- Check `api/index.js` exists and exports Express app
- Review Vercel deployment logs

## Cost

**Free Tier Limits:**
- Vercel: 100GB bandwidth/month, unlimited deployments
- Neon: 0.5GB storage, auto-suspend after 5 min

**For Production:**
- Consider Vercel Pro ($20/mo) for better performance
- Consider Neon paid tier for no auto-suspend

