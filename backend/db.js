const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  // Add some defaults in case env is missing during local run
  ...( !process.env.DATABASE_URL && {
    user: 'postgres',
    host: 'localhost',
    database: 'bingo_db',
    password: '123456',
    port: 5432,
  })
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Prizes table (Now the main entity)
    await client.query(`
      CREATE TABLE IF NOT EXISTS prizes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        winning_pattern JSONB,
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'finished'
        winner_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP
      )
    `);

    // Add columns if they don't exist (for migration)
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prizes' AND column_name='image_url') THEN
          ALTER TABLE prizes ADD COLUMN image_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prizes' AND column_name='winning_pattern') THEN
          ALTER TABLE prizes ADD COLUMN winning_pattern JSONB;
        END IF;
        -- Remove game_style if exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prizes' AND column_name='game_style') THEN
          ALTER TABLE prizes DROP COLUMN game_style;
        END IF;
      END $$;
    `);

    // Drawn numbers linked to a specific prize/round
    await client.query(`
      CREATE TABLE IF NOT EXISTS drawn_numbers (
        id SERIAL PRIMARY KEY,
        prize_id INTEGER REFERENCES prizes(id) ON DELETE CASCADE,
        number INTEGER NOT NULL,
        letter CHAR(1) NOT NULL,
        drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Admin table for login (enhanced version)
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        two_fa_secret TEXT,
        two_fa_enabled BOOLEAN DEFAULT FALSE
      )
    `);

    // Add columns if they don't exist
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='email') THEN
          ALTER TABLE admin_users ADD COLUMN email VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='two_fa_secret') THEN
          ALTER TABLE admin_users ADD COLUMN two_fa_secret TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='two_fa_enabled') THEN
          ALTER TABLE admin_users ADD COLUMN two_fa_enabled BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);

    // Login attempts log
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50),
        ip_address VARCHAR(45),
        user_agent TEXT,
        success BOOLEAN,
        attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Email verification codes for login 2FA
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_verification_codes (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        code VARCHAR(6) NOT NULL,
        email VARCHAR(255),
        used BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Clean up expired codes
    await client.query(`
      DELETE FROM email_verification_codes 
      WHERE expires_at < NOW() OR used = TRUE
    `);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e; // Rethrow to let the caller handle it
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  initDb,
  query: (text, params) => pool.query(text, params),
};
