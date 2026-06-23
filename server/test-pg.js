const { Pool } = require('pg');

const pool1 = new Pool({
  connectionString: 'postgresql://postgres.dfzfwwmmhapwmsxxbahp:brothereisnothingtohide@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

pool1.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Pool1 failed:', err.message);
  else console.log('Pool1 success:', res.rows);
  pool1.end();
});

const pool2 = new Pool({
  connectionString: 'postgresql://postgres.dfzfwwmmhapwmsxxbahp:brothereisnothingtohide@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

pool2.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Pool2 failed:', err.message);
  else console.log('Pool2 success:', res.rows);
  pool2.end();
});

