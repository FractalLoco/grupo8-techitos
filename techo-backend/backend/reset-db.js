import pg from 'pg';

const client = new pg.Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '5235',
  database: 'postgres' // Connect to default postgres DB first
});

async function resetDB() {
  try {
    await client.connect();
    console.log('Conectado a PostgreSQL');
    
    // Terminar todas las conexiones a techo_db
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'techo_db'
        AND pid <> pg_backend_pid();
    `);
    
    // Dropear la BD
    await client.query('DROP DATABASE IF EXISTS techo_db;');
    console.log('BD techo_db eliminada');
    
    // Crear la BD nueva
    await client.query('CREATE DATABASE techo_db;');
    console.log('BD techo_db creada');
    
    await client.end();
    console.log('✅ Base de datos reseteada');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetDB();
