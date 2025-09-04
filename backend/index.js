const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 15000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:mypassword@127.0.0.1:5432/postgres'
});

app.use(cors());
app.use(express.json());

// Ensure "tasks" table exists
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      text VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT false
    );
  `);
  console.log('✅ PostgreSQL connected & table ready');
};

// Routes
app.get('/tasks', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks ORDER BY id ASC');
  res.json(rows);
});

app.post('/tasks', async (req, res) => {
  const { text, completed } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO tasks (text, completed) VALUES ($1, $2) RETURNING *',
    [text, completed || false]
  );
  res.json(rows[0]);
});

app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { text, completed } = req.body;
  const { rows } = await pool.query(
    'UPDATE tasks SET text=$1, completed=$2 WHERE id=$3 RETURNING *',
    [text, completed, id]
  );
  res.json(rows[0]);
});

app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
  res.sendStatus(204);
});

// Start server only after DB is ready
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🌱 BloomUp backend running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ PostgreSQL connection error:', err.message);
});
