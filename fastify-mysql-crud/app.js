require('dotenv').config(); // load .env if not yet

const fastify = require('fastify')({ logger: true });

const mysql = require('mysql2/promise');

// Use env variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'testdb',
});



// Helper to query database
async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Routes
fastify.get('/', async (request, reply) => {
  return { message: 'Welcome to Fastify MySQL CRUD API' };
});

// Create User
fastify.post('/users', async (request, reply) => {
  const { name, email } = request.body;

  if (!name || !email) {
    return reply.status(400).send({ error: 'Name and email are required' });
  }

  try {
    const result = await query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
    return { id: result.insertId, name, email };
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Database error' });
  }
});

// Get All Users
fastify.get('/users', async () => {
  const users = await query('SELECT * FROM users');
  return users;
});

// Get User by ID
fastify.get('/users/:id', async (request, reply) => {
  const { id } = request.params;
  const users = await query('SELECT * FROM users WHERE id = ?', [id]);
  if (users.length === 0) {
    return reply.status(404).send({ error: 'User not found' });
  }
  return users[0];
});

// Update User
fastify.put('/users/:id', async (request, reply) => {
  const { id } = request.params;
  const { name, email } = request.body;

  if (!name && !email) {
    return reply.status(400).send({ error: 'At least one field (name or email) required to update' });
  }

  const fields = [];
  const values = [];

  if (name) {
    fields.push('name = ?');
    values.push(name);
  }
  if (email) {
    fields.push('email = ?');
    values.push(email);
  }
  values.push(id);

  try {
    const result = await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    if (result.affectedRows === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return { id: Number(id), name, email };
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Database error' });
  }
});

// Delete User
fastify.delete('/users/:id', async (request, reply) => {
  const { id } = request.params;
  try {
    const result = await query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }
    return { message: 'User deleted successfully' };
  } catch (err) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Database error' });
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Server listening on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();