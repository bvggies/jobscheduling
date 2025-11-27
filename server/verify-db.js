// Quick script to verify Neon database connection
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') 
    ? { rejectUnauthorized: false } 
    : false,
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Connection string:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'NOT SET');
    
    const result = await pool.query('SELECT NOW(), version()');
    console.log('✅ Connection successful!');
    console.log('Current time:', result.rows[0].now);
    console.log('PostgreSQL version:', result.rows[0].version.split(',')[0]);
    
    // Test table creation
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('\n📊 Existing tables:', tables.rows.map(r => r.table_name).join(', ') || 'None');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('   → Cannot resolve database host');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   → Connection refused');
    } else if (error.message.includes('SSL')) {
      console.error('   → SSL error - Neon requires SSL');
    } else if (error.message.includes('password')) {
      console.error('   → Authentication failed - check credentials');
    }
    await pool.end();
    process.exit(1);
  }
}

testConnection();

