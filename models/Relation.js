const db = require('../config/database');

class Relation {
  static async create(watcherId, targetId) {
    const sql = 'INSERT INTO relations (watcher_id, target_id) VALUES (?, ?)';
    const result = await db.query(sql, [watcherId, targetId]);
    return await this.findById(result.insertId);
  }

  static async findById(id) {
    const sql = 'SELECT * FROM relations WHERE id = ?';
    const relations = await db.query(sql, [id]);
    return relations[0] || null;
  }

  static async findByWatcher(watcherId) {
    const sql = `
      SELECT r.*, u.username as target_username 
      FROM relations r
      JOIN users u ON r.target_id = u.id
      WHERE r.watcher_id = ?
      ORDER BY r.created_at DESC
    `;
    return await db.query(sql, [watcherId]);
  }

  static async findByTarget(targetId) {
    const sql = `
      SELECT r.*, u.username as watcher_username 
      FROM relations r
      JOIN users u ON r.watcher_id = u.id
      WHERE r.target_id = ?
      ORDER BY r.created_at DESC
    `;
    return await db.query(sql, [targetId]);
  }

  static async exists(watcherId, targetId) {
    const sql = 'SELECT * FROM relations WHERE watcher_id = ? AND target_id = ?';
    const relations = await db.query(sql, [watcherId, targetId]);
    return relations.length > 0;
  }

  static async remove(watcherId, targetId) {
    const sql = 'DELETE FROM relations WHERE watcher_id = ? AND target_id = ?';
    const result = await db.query(sql, [watcherId, targetId]);
    return result.affectedRows > 0;
  }

  static async getWatchersForTarget(targetId) {
    const sql = `
      SELECT r.*, u.username as watcher_username 
      FROM relations r
      JOIN users u ON r.watcher_id = u.id
      WHERE r.target_id = ?
    `;
    return await db.query(sql, [targetId]);
  }

  static async getTargetsForWatcher(watcherId) {
    const sql = `
      SELECT r.*, u.username as target_username 
      FROM relations r
      JOIN users u ON r.target_id = u.id
      WHERE r.watcher_id = ?
    `;
    return await db.query(sql, [watcherId]);
  }
}

module.exports = Relation;