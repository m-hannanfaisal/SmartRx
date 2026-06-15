const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const setup = async () => {
  const client1 = new Client({
    connectionString: 'postgresql://postgres:hannan123@localhost:5432/postgres'
  });

  try {
    await client1.connect();
    const res = await client1.query("SELECT 1 FROM pg_database WHERE datname='smartrx'");
    if (res.rowCount === 0) {
      console.log('Creating database smartrx...');
      await client1.query('CREATE DATABASE smartrx');
    }
  } catch (err) {
    console.error('Error connecting to default postgres DB:', err);
    process.exit(1);
  } finally {
    await client1.end();
  }

  const client2 = new Client({
    connectionString: 'postgresql://postgres:hannan123@localhost:5432/smartrx'
  });

  try {
    await client2.connect();
    
    console.log('Cleaning up existing schema...');
    await client2.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

    console.log('Running schema.sql...');
    const schema1 = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf-8');
    await client2.query(schema1);
    
    console.log('Running schema-patient-portal.sql...');
    const schema2 = fs.readFileSync(path.join(__dirname, '../schema-patient-portal.sql'), 'utf-8');
    await client2.query(schema2);

    console.log('Database setup complete.');
  } catch (err) {
    console.error('Error setting up schema:', err);
    process.exit(1);
  } finally {
    await client2.end();
  }
};

setup();
