const { Client } = require('pg');

const passwords = ['admin', 'postgres', 'root', 'password', '1234', '123456', '', '123'];

async function testPasswords() {
  for (const pwd of passwords) {
    const client = new Client({
      connectionString: `postgresql://postgres:${pwd}@localhost:5432/postgres`
    });
    
    try {
      await client.connect();
      console.log(`SUCCESS with password: "${pwd}"`);
      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`Failed with password: "${pwd}"`);
    }
  }
  console.log("All common passwords failed.");
  process.exit(1);
}

testPasswords();
