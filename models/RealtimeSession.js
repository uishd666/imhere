const db = require('../config/database');

class RealtimeSession {
  static async create(initiatorId, targetId) {
    const sql = 'INSERT INTO realtime_sessions (initiator_id, target_id, status) VALUES (?, ?, ?)';
    const [result] = await db.query(sql, [initiatorId, targetId, 'pending']);
    return await this.findById(result.insertId);
  }

  static async findById(id) {
    const sql = `
      SELECT rs.*, 
             i.username as initiator_username,
             t.username as target_username
      FROM realtime_sessions rs
      JOIN users i ON rs.initiator_id = i.id
      JOIN users t ON rs.target_id = t.id
      WHERE rs.id = ?
    `;
    const sessions = await db.query(sql, [id]);
    return sessions[0] || null;
  }

  static async findActiveSession(initiatorId, targetId) {
    const sql = `
      SELECT rs.*, 
             i.username as initiator_username,
             t.username as target_username
      FROM realtime_sessions rs
      JOIN users i ON rs.initiator_id = i.id
      JOIN users t ON rs.target_id = t.id
      WHERE ((rs.initiator_id = ? AND rs.target_id = ?) 
         OR (rs.initiator_id = ? AND rs.target_id = ?))
        AND rs.status = 'active'
    `;
    const sessions = await db.query(sql, [initiatorId, targetId, targetId, initiatorId]);
    return sessions[0] || null;
  }

  static async findByUserId(userId, status = null) {
    let sql = `
      SELECT rs.*, 
             i.username as initiator_username,
             t.username as target_username
      FROM realtime_sessions rs
      JOIN users i ON rs.initiator_id = i.id
      JOIN users t ON rs.target_id = t.id
      WHERE (rs.initiator_id = ? OR rs.target_id = ?)
    `;
    const params = [userId, userId];

    if (status) {
      sql += ' AND rs.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY rs.created_at DESC';
    return await db.query(sql, params);
  }

  static async updateStatus(sessionId, status) {
    const sql = 'UPDATE realtime_sessions SET status = ? WHERE id = ?';
    const [result] = await db.query(sql, [status, sessionId]);
    return result.affectedRows > 0;
  }

  static async endSession(sessionId) {
    return await this.updateStatus(sessionId, 'ended');
  }

  static async acceptSession(sessionId) {
    return await this.updateStatus(sessionId, 'active');
  }

  static async hasActiveSession(userId1, userId2) {
    const sql = `
      SELECT COUNT(*) as count
      FROM realtime_sessions
      WHERE ((initiator_id = ? AND target_id = ?) 
         OR (initiator_id = ? AND target_id = ?))
        AND status = 'active'
    `;
    const results = await db.query(sql, [userId1, userId2, userId2, userId1]);
    return results[0].count > 0;
  }
}

module.exports = RealtimeSession;
