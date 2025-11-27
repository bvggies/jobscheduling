# How to Start the Application

## Quick Start

You need **TWO terminals** running simultaneously:

### Terminal 1: Backend Server

```bash
cd server
npm start
```

You should see:
```
Server is running on port 5000
Database connection established
Connected to: ep-cool-grass-ahisn1s9-pooler.c-3.us-east-1.aws.neon.tech
Database tables initialized successfully
```

**Keep this terminal running!** Don't close it.

### Verify Database Connection (Optional)

Before starting the server, you can test the Neon database connection:

```bash
cd server
node verify-db.js
```

This will verify your Neon database connection and show existing tables.

### Terminal 2: Frontend

```bash
npm start
```

The app will open at `http://localhost:3000`

## Troubleshooting

### Backend won't start?

1. **Check if port 5000 is already in use:**
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :5000
   ```

2. **Change the port:**
   - Edit `server/.env` and change `PORT=5000` to `PORT=5001`
   - Edit root `.env` and change `REACT_APP_API_URL=http://localhost:5000/api` to `http://localhost:5001/api`

3. **Check database connection:**
   - Verify `server/.env` has your `DATABASE_URL`
   - Test connection: `psql "your_connection_string"`

### Frontend can't connect to backend?

1. **Verify backend is running:**
   - Visit: `http://localhost:5000/api/health`
   - Should see: `{"status":"OK","message":"Job Scheduling API is running"}`

2. **Check environment variables:**
   - Root `.env` should have: `REACT_APP_API_URL=http://localhost:5000/api`
   - Restart frontend after changing `.env`

3. **Check browser console:**
   - Look for CORS errors
   - Check Network tab for failed requests

### Still having issues?

See `TROUBLESHOOTING.md` for more detailed help.

