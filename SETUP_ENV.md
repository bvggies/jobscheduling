# Environment Variables Setup

## Neon Database Connection String

Your Neon database connection string:
```
postgresql://neondb_owner:npg_c6tLUkaby9dT@ep-cool-grass-ahisn1s9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Local Development Setup

### 1. Create `server/.env` file:

```env
DATABASE_URL=postgresql://neondb_owner:npg_c6tLUkaby9dT@ep-cool-grass-ahisn1s9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
PORT=5000
NODE_ENV=development
```

### 2. Create `.env` in root directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Vercel Deployment Setup

### Environment Variables to Set in Vercel:

1. Go to your Vercel project → Settings → Environment Variables

2. Add these variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_c6tLUkaby9dT@ep-cool-grass-ahisn1s9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |
| `REACT_APP_API_URL` | `https://your-app.vercel.app/api` | Production, Preview, Development |

**Important Notes:**
- ⚠️ **Never commit `.env` files to Git** - they're already in `.gitignore`
- 🔒 Keep your connection string secure
- 🔄 After adding `REACT_APP_API_URL`, you need to redeploy for it to take effect
- ✅ The connection string already includes `?sslmode=require` which is correct for Neon

## Testing the Connection

You can test your database connection using psql:

```bash
psql "postgresql://neondb_owner:npg_c6tLUkaby9dT@ep-cool-grass-ahisn1s9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

Or test from your app:
1. Start the backend: `cd server && npm start`
2. Visit: `http://localhost:5000/api/health`
3. The database tables will auto-create on first API request

## Security Reminders

- ✅ Connection strings are in `.gitignore` - safe from accidental commits
- ✅ Use Vercel environment variables for production (encrypted)
- ⚠️ Don't share your connection string publicly
- 🔄 Consider rotating credentials if exposed

