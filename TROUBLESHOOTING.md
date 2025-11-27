# Troubleshooting Guide

## Common Issues and Solutions

### "Failed to save job" Error

**Possible Causes:**

1. **Backend server not running**
   - Solution: Start the backend server
   ```bash
   cd server
   npm start
   ```

2. **Database connection issue**
   - Check your `server/.env` file has the correct `DATABASE_URL`
   - Verify your Neon database is active
   - Test connection: `psql "your_connection_string"`

3. **Missing required fields**
   - Make sure all required fields are filled:
     - Job Name
     - Customer Name
     - Product Type
     - Quantity
     - Substrate
     - Due Date
     - Priority

4. **API URL not configured**
   - Check `.env` file in root has: `REACT_APP_API_URL=http://localhost:5000/api`
   - For production, set in Vercel environment variables

### Backend Server Issues

**Server won't start:**
```bash
cd server
npm install  # Install dependencies
npm start    # Start server
```

**Port already in use:**
- Change PORT in `server/.env` to a different port (e.g., 5001)
- Update `REACT_APP_API_URL` in root `.env` to match

### Database Connection Issues

**Connection timeout:**
- Verify `DATABASE_URL` includes `?sslmode=require`
- Check Neon console - database might be suspended
- Ensure IP allowlist allows all IPs in Neon settings

**Tables not created:**
- Tables auto-create on first API request
- Check server logs for initialization messages
- Manually trigger by visiting: `http://localhost:5000/api/health`

### Frontend Issues

**API calls failing:**
- Check browser console for CORS errors
- Verify backend is running on correct port
- Check `REACT_APP_API_URL` environment variable

**Build errors:**
```bash
npm run build
# Check for specific error messages
```

### Vercel Deployment Issues

**Environment variables not working:**
- Variables must be set in Vercel dashboard
- After adding/updating, **redeploy** the project
- Check Vercel function logs for errors

**Database connection in production:**
- Verify `DATABASE_URL` is set in Vercel
- Check Neon allows connections from Vercel IPs
- Review Vercel function logs for connection errors

## Getting Help

1. Check browser console for errors
2. Check server logs for backend errors
3. Check Vercel function logs (if deployed)
4. Verify all environment variables are set correctly
5. Test database connection separately

