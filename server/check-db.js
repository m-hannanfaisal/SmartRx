const { Client } = require('pg');

const run = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres:hannan123@localhost:5432/smartrx'
  });
  await client.connect();
  
  const docRes = await client.query('SELECT * FROM doctors');
  console.log('Doctors:', docRes.rows);

  const tplRes = await client.query('SELECT * FROM disease_templates');
  console.log('Templates:', tplRes.rows);

  await client.end();
};
run();
