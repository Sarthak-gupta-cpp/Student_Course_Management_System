const mysql = require('mysql2/promise');
const fs = require('fs');

async function updateDB() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1]] = match[2].replace(/['"]/g, '');
    }
  });

  try {
    const connection = await mysql.createConnection({
      host: env.DB_HOST || 'localhost',
      user: env.DB_USER || 'root',
      password: env.DB_PASSWORD || '',
      database: env.DB_NAME || 'course_management',
    });

    console.log('Connected to DB');
    await connection.query('ALTER TABLE enrollments ADD COLUMN proposed_grade VARCHAR(5) DEFAULT NULL AFTER grade;').catch(e => {
      if(e.code === 'ER_DUP_FIELDNAME') console.log('Column already exists');
      else throw e;
    });
    console.log('Schema updated successfully');
    await connection.end();
  } catch (error) {
    console.error('Error updating schema:', error);
  }
}

updateDB();
