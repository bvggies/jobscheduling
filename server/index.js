const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jobsRoutes = require('./routes/jobs');
const machinesRoutes = require('./routes/machines');
const scheduleRoutes = require('./routes/schedule');
const analyticsRoutes = require('./routes/analytics');
const alertsRoutes = require('./routes/alerts');
const db = require('./config/database');

dotenv.config();

const app = express();

// CORS configuration - allow all origins in production (Vercel handles this)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true // Allow all origins in production (Vercel)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());

// Database connection - initialize on first request
let dbInitialized = false;
const initializeDb = async () => {
  if (!dbInitialized) {
    await db.connect();
    dbInitialized = true;
  }
};

// Middleware to ensure DB is initialized
app.use(async (req, res, next) => {
  await initializeDb();
  next();
});

// Routes
app.use('/api/jobs', jobsRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Job Scheduling API is running' });
});

// For Vercel serverless functions
module.exports = app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  db.connect().then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  });
}

