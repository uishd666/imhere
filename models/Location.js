const db = require('../config/database');

class Location {
  static async create(userId, lat, lng) {
    const sql = 'INSERT INTO locations (user_id, lat, lng) VALUES (?, ?, ?)';
    const result = await db.query(sql, [userId, lat, lng]);
    return await this.findById(result.insertId);
  }

  static async findById(id) {
    const sql = 'SELECT * FROM locations WHERE id = ?';
    const locations = await db.query(sql, [id]);
    return locations[0] || null;
  }

  static async findByUserId(userId, limit = 10) {
    const sql = 'SELECT * FROM locations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?';
    return await db.query(sql, [userId, limit]);
  }

  static async getLatestByUserId(userId) {
    const sql = 'SELECT * FROM locations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1';
    const locations = await db.query(sql, [userId]);
    return locations[0] || null;
  }

  static async getLatestForWatchers(watcherId) {
    const sql = `
      SELECT l.*, u.username 
      FROM locations l
      JOIN users u ON l.user_id = u.id
      JOIN relations r ON l.user_id = r.target_id
      WHERE r.watcher_id = ?
      ORDER BY l.created_at DESC
    `;
    return await db.query(sql, [watcherId]);
  }

  static async getLatestByTargetId(targetId, watcherId) {
    const sql = `
      SELECT l.*, u.username 
      FROM locations l
      JOIN users u ON l.user_id = u.id
      WHERE l.user_id = ? AND EXISTS (
        SELECT 1 FROM relations r 
        WHERE r.target_id = ? AND r.watcher_id = ?
      )
      ORDER BY l.created_at DESC 
      LIMIT 1
    `;
    const locations = await db.query(sql, [targetId, targetId, watcherId]);
    return locations[0] || null;
  }

  static async getHistoryByUserId(userId, startTime = null, endTime = null) {
    let sql = `
      SELECT l.*, u.username 
      FROM locations l
      JOIN users u ON l.user_id = u.id
      WHERE l.user_id = ?
    `;
    const params = [userId];

    if (startTime) {
      sql += ' AND l.created_at >= ?';
      params.push(startTime);
    }

    if (endTime) {
      sql += ' AND l.created_at <= ?';
      params.push(endTime);
    }

    sql += ' ORDER BY l.created_at DESC';
    
    return await db.query(sql, params);
  }

  static async deleteOldLocations(hoursOld = 24) {
    const sql = 'DELETE FROM locations WHERE created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)';
    const result = await db.query(sql, [hoursOld]);
    return result.affectedRows;
  }
}

module.exports = Location;