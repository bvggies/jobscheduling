const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires SSL - enable it for all environments
  ssl: process.env.DATABASE_URL?.includes('neon.tech') 
    ? { rejectUnauthorized: false } 
    : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
  // Optimize for serverless
  max: 1, // Limit connections for serverless
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit in serverless - just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

const query = (text, params) => pool.query(text, params);

const connect = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection established');
    console.log('Connected to:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'database');
    await initializeDatabase();
  } catch (error) {
    console.error('Database connection error:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('❌ Cannot resolve database host. Check your DATABASE_URL.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Check if database is accessible.');
    } else if (error.message.includes('SSL')) {
      console.error('❌ SSL connection error. Neon requires SSL - check your connection string includes ?sslmode=require');
    } else {
      console.error('❌ Database error details:', error);
    }
  }
};

const initializeDatabase = async () => {
  try {
    // Create machines table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS machines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        compatibility TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create jobs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        job_name VARCHAR(255) NOT NULL,
        po_number VARCHAR(100),
        customer_name VARCHAR(255) NOT NULL,
        product_type VARCHAR(100) NOT NULL,
        quantity INTEGER NOT NULL,
        substrate VARCHAR(255) NOT NULL,
        finishing TEXT[],
        due_date DATE NOT NULL,
        due_time TIME,
        priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Rush')),
        status VARCHAR(20) DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'Ready', 'In Progress', 'Completed')),
        machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
        scheduled_start TIMESTAMP,
        scheduled_end TIMESTAMP,
        total_cost DECIMAL(10, 2),
        deposit_required DECIMAL(10, 2),
        deposit_received DECIMAL(10, 2) DEFAULT 0,
        deposit_date DATE,
        deposit_status VARCHAR(20) DEFAULT 'Pending' CHECK (deposit_status IN ('Pending', 'Received')),
        final_payment_received DECIMAL(10, 2) DEFAULT 0,
        final_payment_date DATE,
        payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create alerts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
        severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add due_time column if it doesn't exist (for existing databases)
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'jobs' AND column_name = 'due_time'
          ) THEN
            ALTER TABLE jobs ADD COLUMN due_time TIME;
          END IF;
        END $$;
      `);
    } catch (error) {
      console.log('Note: due_time column may already exist or could not be added:', error.message);
    }

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_due_date ON jobs(due_date);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_machine_id ON jobs(machine_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_customer_name ON jobs(customer_name);
      CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(read);
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = {
  query,
  pool,
  connect,
};

