# Quick Start Guide

Get up and running with JobScheduler in minutes!

## Local Development Setup

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Set Up Environment Variables

Create `.env` in the root directory:
```
REACT_APP_API_URL=http://localhost:5000/api
```

Create `server/.env`:
```
DATABASE_URL=your_neon_postgresql_connection_string
PORT=5000
NODE_ENV=development
```

**Get Neon Connection String:**
1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project (or use existing)
3. Copy the connection string from the dashboard
4. It looks like: `postgresql://user:password@host/database?sslmode=require`

### 3. Start the Backend Server

```bash
cd server
npm start
```

The server will start on `http://localhost:5000`

### 4. Start the Frontend

In a new terminal:
```bash
npm start
```

The app will open at `http://localhost:3000`

## First Steps

1. **Create a Machine**
   - Go to "Machines" in the sidebar
   - Click "New Machine"
   - Enter machine name, type, and compatibility
   - Save

2. **Create a Job**
   - Go to "Jobs" in the sidebar
   - Click "New Job"
   - Fill in all required fields
   - Set total cost and deposit required
   - Save

3. **Record Deposit Payment**
   - Edit the job you just created
   - Scroll to "Payment Status" section
   - Click "Record Deposit"
   - Enter amount and date
   - Save

4. **Mark Job as Ready**
   - After deposit is received, you can now mark job as "Ready"
   - Update the status dropdown in the job form

5. **Auto-Schedule Jobs**
   - Go to "Schedule" page
   - Click "Auto-Schedule" button
   - Jobs will be automatically assigned to compatible machines

6. **View Analytics**
   - Go to "Analytics" page
   - View performance metrics and machine utilization

## Deploy to Vercel

### Quick Deploy

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Add environment variables:
     - `DATABASE_URL`: Your Neon connection string
     - `NODE_ENV`: `production`
   - Deploy!

3. **After first deploy**, update `REACT_APP_API_URL`:
   - Go to Project Settings → Environment Variables
   - Add: `REACT_APP_API_URL` = `https://your-app.vercel.app/api`
   - Redeploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Common Tasks

### Adding Multiple Machines
1. Go to Machines → New Machine
2. Repeat for each machine you want to add

### Scheduling Jobs Manually
1. Go to Schedule page
2. View current schedule
3. Edit jobs individually to assign to different machines

### Tracking Payments
1. Edit any job
2. Use the Payment Status section to record deposits and final payments
3. Visual indicators show payment status at a glance

### Setting Up Alerts
- Alerts are automatically generated for:
  - Jobs at risk of missing due date
  - Machine underutilization
  - Rush jobs
  - Late jobs

## Tips

- **Priority Levels**: Use Rush for urgent jobs, High for important, Medium for normal, Low for flexible
- **Machine Compatibility**: Set substrate compatibility to ensure jobs are only scheduled on appropriate machines
- **Deposit Requirement**: Jobs cannot be marked "Ready" until deposit is received
- **Auto-Scheduling**: Groups jobs by substrate to minimize changeovers

## Troubleshooting

**Database connection error?**
- Check your DATABASE_URL in server/.env
- Ensure your Neon database is active
- Verify SSL mode is set correctly (`?sslmode=require`)

**API not responding?**
- Make sure backend server is running on port 5000
- Check REACT_APP_API_URL in .env matches your backend URL
- Check browser console for CORS errors

**Jobs not scheduling?**
- Ensure machines are created
- Check machine compatibility matches job substrate
- Verify deposit is received for jobs (required for scheduling)

**Vercel deployment issues?**
- Check environment variables are set correctly
- Verify DATABASE_URL includes `?sslmode=require`
- Check Vercel function logs for errors
- Ensure all files are committed to Git

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Customize the scheduling algorithm in `server/utils/scheduler.js`
- Add more machine types and substrates as needed
