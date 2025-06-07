// server.js - Main backend for SMIS Web Portal
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());

// --- Database Setup (run once at startup) ---
async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      teacher_id INTEGER REFERENCES teachers(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      class_id INTEGER REFERENCES classes(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      class_id INTEGER REFERENCES classes(id)
    );
    CREATE TABLE IF NOT EXISTS student_updates (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Create default teacher if not exists
  const username = 'teacher';
  const password = 'password';
  const result = await pool.query('SELECT * FROM teachers WHERE username = $1', [username]);
  if (result.rows.length === 0) {
    const password_hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO teachers (username, password_hash) VALUES ($1, $2)', [username, password_hash]);
    console.log('Default teacher created: teacher/password');
  }
}
setupDatabase().catch(console.error);

// --- Auth Middleware ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// --- API Routes ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM teachers WHERE username = $1', [username]);
    const teacher = result.rows[0];
    if (!teacher) return res.status(400).json({ message: 'Invalid credentials' });
    const isPasswordValid = await bcrypt.compare(password, teacher.password_hash);
    if (!isPasswordValid) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: teacher.id, username: teacher.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', username: teacher.username, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.get('/api/classes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description FROM classes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Server error fetching classes' });
  }
});

app.post('/api/classes', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  try {
    const teacherResult = await pool.query('SELECT id FROM teachers WHERE username = $1', ['teacher']);
    const teacherId = teacherResult.rows[0].id;
    const result = await pool.query(
      'INSERT INTO classes (name, description, teacher_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, teacherId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding class:', error);
    res.status(500).json({ message: 'Server error adding class' });
  }
});

app.get('/api/classes/:classId/materials', authenticateToken, async (req, res) => {
  const { classId } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, title, content, created_at FROM materials WHERE class_id = $1 ORDER BY created_at DESC',
      [classId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ message: 'Server error fetching materials' });
  }
});

app.post('/api/classes/:classId/materials', authenticateToken, async (req, res) => {
  const { classId } = req.params;
  const { title, content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO materials (title, content, class_id) VALUES ($1, $2, $3) RETURNING *',
      [title, content, classId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding material:', error);
    res.status(500).json({ message: 'Server error adding material' });
  }
});

app.get('/api/classes/:classId/students', authenticateToken, async (req, res) => {
  const { classId } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, name FROM students WHERE class_id = $1 ORDER BY name ASC',
      [classId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error fetching students' });
  }
});

app.post('/api/classes/:classId/students', authenticateToken, async (req, res) => {
  const { classId } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO students (name, class_id) VALUES ($1, $2) RETURNING *',
      [name, classId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ message: 'Server error adding student' });
  }
});

app.get('/api/students/:studentId/updates', authenticateToken, async (req, res) => {
  const { studentId } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, content, created_at FROM student_updates WHERE student_id = $1 ORDER BY created_at DESC',
      [studentId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student updates:', error);
    res.status(500).json({ message: 'Server error fetching student updates' });
  }
});

app.post('/api/students/:studentId/updates', authenticateToken, async (req, res) => {
  const { studentId } = req.params;
  const { content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO student_updates (student_id, content) VALUES ($1, $2) RETURNING *',
      [studentId, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding student update:', error);
    res.status(500).json({ message: 'Server error adding student update' });
  }
});

app.listen(PORT, () => {
  console.log(`SMIS - WEB PORTAL Backend running on port ${PORT}`);
  console.log(`Access the backend at: https://smis-server.onrender.com:${PORT}`);
  console.log(`Database connected: ${process.env.DATABASE_URL}`);
  console.log(`JWT Secret: ${JWT_SECRET}`);
  console.log(`CORS enabled for all origins`);
  console.log(`API Documentation: https://smis-server.onrender.com/api-docs`);
  console.log(`Default teacher credentials: username: teacher, password: password`);
  console.log(`To change the default teacher credentials, update the .env file`);
  console.log(`To change the JWT secret, update the .env file`);
  console.log(`To change the database connection string, update the .env file`);
  console.log(`To change the server port, update the .env file or use the PORT environment variable`);
  console.log(`To access the API, use the following endpoints:
  - POST /api/login: Login to get a JWT token
  - GET /api/classes: Get all classes
  - POST /api/classes: Create a new class
  - GET /api/classes/:classId/materials: Get materials for a class
  - POST /api/classes/:classId/materials: Add material to a class
  - GET /api/classes/:classId/students: Get students in a class
  - POST /api/classes/:classId/students: Add a student to a class
  - GET /api/students/:studentId/updates: Get updates for a student
  - POST /api/students/:studentId/updates: Add an update for a student`);
  console.log(`To access the API documentation, visit: https://smis-server.onrender.com/api-docs`);
  console.log(`To access the frontend, visit: https://smis-portal.onrender.com`);
  console.log(`To report issues or contribute, visit:www.github.com/refatwashere/smis-web-portal`);
  console.log(`Thank you for using SMIS Web Portal!`);
});
// Export the app for testing
module.exports = app;
// Export the pool for database access in other modules
module.exports.pool = pool;
// Export the JWT secret for use in other modules
module.exports.JWT_SECRET = JWT_SECRET;
// Export the PORT for use in other modules
module.exports.PORT = PORT;
// Export the setupDatabase function for use in other modules
module.exports.setupDatabase = setupDatabase;
// Export the authenticateToken middleware for use in other modules
module.exports.authenticateToken = authenticateToken;
// Export the express app for use in other modules
module.exports.app = app;
// Export the bcrypt library for use in other modules
module.exports.bcrypt = bcrypt;
// Export the jwt library for use in other modules
module.exports.jwt = jwt;
// Export the dotenv library for use in other modules
module.exports.dotenv = require('dotenv');
// Export the cors library for use in other modules
module.exports.cors = cors;
// Export the express library for use in other modules
module.exports.express = express;
// Export the Pool class from pg for use in other modules
module.exports.Pool = Pool;
// Export the process.env for use in other modules
module.exports.processEnv = process.env;
// Export the console for use in other modules
module.exports.console = console;
// Export the require function for use in other modules
module.exports.require = require;
// Export the global object for use in other modules
module.exports.global = global;
// Export the module object for use in other modules
module.exports.module = module;
// Export the __dirname for use in other modules
module.exports.__dirname = __dirname;
// Export the __filename for use in other modules
module.exports.__filename = __filename;
// Export the path module for use in other modules
module.exports.path = require('path');
// Export the fs module for use in other modules
module.exports.fs = require('fs');
// Export the os module for use in other modules
module.exports.os = require('os');
// Export the http module for use in other modules
module.exports.http = require('http');
// Export the https module for use in other modules
module.exports.https = require('https');
// Export the url module for use in other modules
module.exports.url = require('url');
// Export the querystring module for use in other modules
module.exports.querystring = require('querystring');
// Export the util module for use in other modules
module.exports.util = require('util');
// Export the crypto module for use in other modules
module.exports.crypto = require('crypto');
// Export the zlib module for use in other modules
module.exports.zlib = require('zlib');
// Export the stream module for use in other modules
module.exports.stream = require('stream');
// Export the events module for use in other modules
module.exports.events = require('events');  