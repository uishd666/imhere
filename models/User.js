const bcrypt = require('bcryptjs');
const db = require('../config/database');

class User {
  static async create(userData) {
    const { username, password } = userData;
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
    const result = await db.query(sql, [username, hashedPassword]);
    
    return await this.findById(result.insertId);
  }

  static async findById(id) {
    const sql = 'SELECT id, username, created_at FROM users WHERE id = ?';
    const users = await db.query(sql, [id]);
    return users[0] || null;
  }

  static async findByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    const users = await db.query(sql, [username]);
    return users[0] || null;
  }

  static async findByUsernameWithPassword(username) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    const users = await db.query(sql, [username]);
    return users[0] || null;
  }

  static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  static async getAll() {
    const sql = 'SELECT id, username, created_at FROM users ORDER BY created_at DESC';
    return await db.query(sql);
  }

  static async updateLastLocation(userId, lat, lng) {
    const sql = 'INSERT INTO locations (user_id, lat, lng) VALUES (?, ?, ?)';
    await db.query(sql, [userId, lat, lng]);
    return true;
  }

  static async getLatestLocation(userId) {
    const sql = 'SELECT lat, lng, created_at FROM locations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1';
    const locations = await db.query(sql, [userId]);
    return locations[0] || null;
  }
}

module.exports = User;