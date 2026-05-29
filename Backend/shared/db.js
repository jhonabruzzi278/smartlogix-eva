const { Pool } = require('pg');

function createPool(database) {
  const pool = new Pool({
    connectionString: process.env.DB_URL || `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'admin123'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${database}`,
    max: parseInt(process.env.DB_POOL_MAX || '5', 10),
  });

  pool.on('error', (err) => {
    console.error(JSON.stringify({
      level: 'error', timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME || 'unknown',
      message: 'DB pool error', detail: err.message
    }));
  });

  return pool;
}

module.exports = { createPool };
