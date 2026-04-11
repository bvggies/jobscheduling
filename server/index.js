const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jobsRoutes = require('./routes/jobs');
const machinesRoutes = require('./routes/machines');
const scheduleRoutes = require('./routes/schedule');
const analyticsRoutes = require('./routes/analytics');
const alertsRoutes = require('./routes/alerts');
const authRoutes = require('./routes/auth');
const feedbackRoutes = require('./routes/feedback');
const usersRoutes = require('./routes/users');
const activityRoutes = require('./routes/activity');
const chatRoutes = require('./routes/chat');
const db = require('./config/database');
const { attachChatSocket } = require('./chatSocket');

dotenv.config();

const app = express();

const corsOrigins =
  process.env.NODE_ENV === 'production'
    ? true
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(express.json());

let dbInitialized = false;
const initializeDb = async () => {
  if (!dbInitialized) {
    await db.connect();
    dbInitialized = true;
  }
};

app.use(async (req, res, next) => {
  await initializeDb();
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Job Scheduling API is running' });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  db.connect().then(() => {
    const httpServer = http.createServer(app);
    attachChatSocket(httpServer, corsOrigins);
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} (HTTP + Socket.IO)`);
    });
  });
}
