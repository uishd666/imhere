const express = require('express');
const { body, validationResult } = require('express-validator');
const Location = require('../models/Location');
const Relation = require('../models/Relation');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/update', auth, [
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lat, lng } = req.body;
    const userId = req.user.id;

    await User.updateLastLocation(userId, lat, lng);

    res.json({
      message: 'Location updated successfully',
      location: { lat, lng, timestamp: new Date() }
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/share', auth, [
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lat, lng } = req.body;
    const userId = req.user.id;

    const location = await Location.create(userId, lat, lng);

    res.json({
      message: 'Location shared successfully',
      location: {
        id: location.id,
        lat: location.lat,
        lng: location.lng,
        timestamp: location.created_at
      }
    });
  } catch (error) {
    console.error('Location share error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/shared-with-me', auth, async (req, res) => {
  try {
    const watcherId = req.user.id;
    
    const locations = await Location.getLatestForWatchers(watcherId);

    res.json({
      message: 'Shared locations retrieved successfully',
      locations: locations.map(loc => ({
        id: loc.id,
        fromUser: {
          id: loc.user_id,
          username: loc.username
        },
        lat: loc.lat,
        lng: loc.lng,
        timestamp: loc.created_at
      }))
    });
  } catch (error) {
    console.error('Get shared locations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const watcherId = req.user.id;

    const location = await Location.getLatestByTargetId(userId, watcherId);

    if (!location) {
      return res.status(404).json({ message: 'No location shared with you' });
    }

    res.json({
      message: 'Location retrieved successfully',
      location: {
        lat: location.lat,
        lng: location.lng,
        timestamp: location.created_at
      }
    });
  } catch (error) {
    console.error('Get user location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/follow', auth, [
  body('targetId').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { targetId } = req.body;
    const watcherId = req.user.id;

    if (watcherId === targetId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const existingRelation = await Relation.exists(watcherId, targetId);
    if (existingRelation) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    await Relation.create(watcherId, targetId);

    res.json({
      message: 'Started following user successfully',
      targetUser: {
        id: targetUser.id,
        username: targetUser.username
      }
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/unfollow/:targetId', auth, async (req, res) => {
  try {
    const { targetId } = req.params;
    const watcherId = req.user.id;

    const success = await Relation.remove(watcherId, targetId);
    if (!success) {
      return res.status(404).json({ message: 'Not following this user' });
    }

    res.json({ message: 'Stopped following user successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/following', auth, async (req, res) => {
  try {
    const watcherId = req.user.id;
    const relations = await Relation.findByWatcher(watcherId);

    res.json({
      message: 'Following list retrieved successfully',
      following: relations.map(rel => ({
        id: rel.id,
        targetUser: {
          id: rel.target_id,
          username: rel.target_username
        },
        since: rel.created_at
      }))
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/followers', auth, async (req, res) => {
  try {
    const targetId = req.user.id;
    const relations = await Relation.findByTarget(targetId);

    res.json({
      message: 'Followers list retrieved successfully',
      followers: relations.map(rel => ({
        id: rel.id,
        watcher: {
          id: rel.watcher_id,
          username: rel.watcher_username
        },
        since: rel.created_at
      }))
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const { userId, startTime, endTime } = req.query;
    const currentUserId = req.user.id;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    // Check if current user has permission to access the user's location history
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Allow access if it's the user's own history or if they are following the target user
    let hasPermission = false;
    if (currentUserId == userId) {
      hasPermission = true;
    } else {
      const relation = await Relation.exists(currentUserId, userId);
      hasPermission = !!relation;
    }

    if (!hasPermission) {
      return res.status(403).json({ message: 'You do not have permission to access this user\'s location history' });
    }

    const locations = await Location.getHistoryByUserId(userId, startTime, endTime);

    res.json({
      message: 'Location history retrieved successfully',
      user: {
        id: targetUser.id,
        username: targetUser.username
      },
      locations: locations.map(loc => ({
        id: loc.id,
        lat: loc.lat,
        lng: loc.lng,
        timestamp: loc.created_at
      })),
      filters: {
        startTime: startTime || null,
        endTime: endTime || null
      }
    });
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;