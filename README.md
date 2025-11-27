# JobScheduler - Print Job Management System

A comprehensive web application for managing print shop job scheduling, machine allocation, payment tracking, and analytics.

## Features

### 1. Job Entry & Management
- Create and manage print jobs with detailed information
- Track job name, PO number, customer, product type, quantity, substrate, finishing options
- Set due dates and priorities (Low, Medium, High, Rush)
- Real-time status tracking (Not Started, Ready, In Progress, Completed)

### 2. Machine/Resource Setup
- Define and manage printing machines
- Set machine types (Digital Press, Offset Press, Binder, Cutter, etc.)
- Configure substrate compatibility for each machine

### 3. Smart Scheduling
- Automatic job scheduling based on:
  - Due dates (earlier = higher priority)
  - Machine compatibility
  - Minimal changeovers (groups jobs with same substrate/finishing)
- Manual schedule adjustment capabilities
- Visual schedule timeline

### 4. Payment Status Tracking
- Track initial deposit (required amount, received amount, date, status)
- Track final payment (balance due, received amount, date, status)
- Visual indicators: 💰 (Deposit Pending), ✅ (Deposit Received), 🟢 (Fully Paid)
- Jobs cannot be marked "Ready" unless deposit is received

### 5. Real-Time Job Status Tracking
- Live dashboard with color-coded status indicators
- Status updates: Ready → In Progress → Completed
- Visual indicators for on-time vs late jobs

### 6. Analytics & Reports
- On-time completion rate
- Machine utilization metrics
- Status breakdown
- Late jobs tracking

### 7. Alerts & Notifications
- Jobs at risk of missing due date
- Machine underutilization alerts
- Rush job notifications
- Late job alerts

### 8. Search & Filter
- Filter by status, customer, machine, date range
- Quick search functionality

## Tech Stack

- **Frontend**: React (Create React App)
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (Neon)
- **Animations**: AOS, Framer Motion
- **Styling**: CSS3 with modern design
- **Icons**: React Icons

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database (Neon or local)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd jobscheduling-app
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd server
npm install
cd ..
```

4. Set up environment variables:

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

5. Start the backend server:
```bash
cd server
npm start
```

6. Start the frontend (in a new terminal):
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Deployment

This app is configured to deploy entirely on **Vercel** with **Neon PostgreSQL**.

### Quick Deploy

1. **Set up Neon Database**:
   - Go to [Neon Console](https://console.neon.tech/)
   - Create a new project
   - Copy the connection string

2. **Deploy to Vercel**:
   - Push code to GitHub
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - Add environment variables:
     - `DATABASE_URL`: Your Neon PostgreSQL connection string
     - `NODE_ENV`: `production`
   - Deploy

3. **After first deploy**, add:
   - `REACT_APP_API_URL`: `https://your-app.vercel.app/api`
   - Redeploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Project Structure

```
jobscheduling-app/
├── public/
│   ├── logo.svg
│   ├── favicon.svg
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Navbar.js
│   │   │   └── Sidebar.js
│   │   └── JobPayment.js
│   ├── pages/
│   │   ├── Dashboard.js
│   │   ├── Jobs.js
│   │   ├── JobForm.js
│   │   ├── Machines.js
│   │   ├── MachineForm.js
│   │   ├── Schedule.js
│   │   ├── Analytics.js
│   │   └── Alerts.js
│   ├── services/
│   │   └── api.js
│   ├── utils/
│   │   └── constants.js
│   ├── App.js
│   └── index.js
├── server/
│   ├── config/
│   │   └── database.js
│   ├── routes/
│   │   ├── jobs.js
│   │   ├── machines.js
│   │   ├── schedule.js
│   │   ├── analytics.js
│   │   └── alerts.js
│   ├── utils/
│   │   ├── scheduler.js
│   │   └── alerts.js
│   └── index.js
└── package.json
```

## Features in Detail

### Smart Scheduling Algorithm
- Groups jobs by substrate and finishing to minimize changeovers
- Prioritizes by due date and priority level
- Checks machine compatibility before assignment
- Estimates job duration based on quantity and product type

### Payment Validation
- Jobs require deposit before being marked "Ready"
- Automatic balance calculation
- Payment status tracking with visual indicators

### Real-Time Updates
- Dashboard refreshes every 30 seconds
- Schedule updates every minute
- Alerts checked automatically

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.
