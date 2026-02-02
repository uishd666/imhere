const express = require('express');
const { body, validationResult } = require('express-validator');
const RealtimeSession = require('../models/RealtimeSession');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/start', auth, [
  body('targetId').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { targetId } = req.body;
    const initiatorId = req.user.id;

    if (initiatorId === targetId) {
      return res.status(400).json({ message: 'Cannot start session with yourself' });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const existingSession = await RealtimeSession.findActiveSession(initiatorId, targetId);
    if (existingSession) {
      return res.status(400).json({ 
        message: 'Active session already exists',
        sessionId: existingSession.id
      });
    }

    const session = await RealtimeSession.create(initiatorId, targetId);

    res.json({
      message: 'Realtime session started successfully',
      session: {
        id: session.id,
        initiator: {
          id: session.initiator_id,
          username: session.initiator_username
        },
        target: {
          id: session.target_id,
          username: session.target_username
        },
        status: session.status,
        created_at: session.created_at
      }
    });
  } catch (error) {
    console.error('Start realtime session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/accept', auth, [
  body('sessionId').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.body;
    const userId = req.user.id;

    const session = await RealtimeSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.target_id !== userId) {
      return res.status(403).json({ message: 'Only the target user can accept the session' });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({ message: 'Session is not pending' });
    }

    await RealtimeSession.acceptSession(sessionId);

    res.json({
      message: 'Session accepted successfully',
      session: {
        id: session.id,
        status: 'active',
        initiator: {
          id: session.initiator_id,
          username: session.initiator_username
        },
        target: {
          id: session.target_id,
          username: session.target_username
        }
      }
    });
  } catch (error) {
    console.error('Accept session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/end', auth, [
  body('sessionId').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.body;
    const userId = req.user.id;

    const session = await RealtimeSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.initiator_id !== userId && session.target_id !== userId) {
      return res.status(403).json({ message: 'You are not part of this session' });
    }

    if (session.status === 'ended') {
      return res.status(400).json({ message: 'Session already ended' });
    }

    await RealtimeSession.endSession(sessionId);

    res.json({
      message: 'Session ended successfully',
      session: {
        id: session.id,
        status: 'ended'
      }
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/active', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await RealtimeSession.findByUserId(userId, 'active');

    res.json({
      message: 'Active sessions retrieved successfully',
      sessions: sessions.map(session => ({
        id: session.id,
        initiator: {
          id: session.initiator_id,
          username: session.initiator_username
        },
        target: {
          id: session.target_id,
          username: session.target_username
        },
        status: session.status,
        created_at: session.created_at,
        updated_at: session.updated_at
      }))
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/pending', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await RealtimeSession.findByUserId(userId, 'pending');

    res.json({
      message: 'Pending sessions retrieved successfully',
      sessions: sessions.map(session => ({
        id: session.id,
        initiator: {
          id: session.initiator_id,
          username: session.initiator_username
        },
        target: {
          id: session.target_id,
          username: session.target_username
        },
        status: session.status,
        created_at: session.created_at
      }))
    });
  } catch (error) {
    console.error('Get pending sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/all', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await RealtimeSession.findByUserId(userId);
    
    let deletedCount = 0;
    for (const session of sessions) {
      if (session.status !== 'ended') {
        await RealtimeSession.endSession(session.id);
        deletedCount++;
      }
    }

    res.json({
      message: 'All sessions cleared successfully',
      clearedCount: deletedCount,
      totalSessions: sessions.length
    });
  } catch (error) {
    console.error('Clear all sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;