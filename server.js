const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');
const db = require('./config/database');
const RealtimeSession = require('./models/RealtimeSession');

dotenv.config();

const app = express();
const server = createServer(app);

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
};

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.use(authenticateSocket);

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const testConnection = async () => {
  try {
    await db.query('SELECT 1');
    console.log('Connected to MySQL database');
  } catch (error) {
    console.error('MySQL connection error:', error);
    process.exit(1);
  }
};

testConnection();

app.get('/', (req, res) => {
  res.json({ message: 'ImHere Backend API is running' });
});

const userRoutes = require('./routes/users');
const locationRoutes = require('./routes/locations');
const realtimeRoutes = require('./routes/realtime');

app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/realtime', realtimeRoutes);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id, 'User ID:', socket.userId);

  socket.on('join-room', (userId) => {
    socket.join(userId);
    console.log(`User ${socket.userId} joined room ${userId}`);
  });

  socket.on('location-update', async (data) => {
    try {
      const { latitude, longitude, timestamp } = data;
      const userId = socket.userId;
      
      const hasActiveSession = await RealtimeSession.hasActiveSession(userId, data.targetUserId);
      if (!hasActiveSession) {
        console.log(`No active session between users ${userId} and ${data.targetUserId}`);
        return;
      }
      
      socket.to(data.targetUserId).emit('location-received', {
        fromUserId: userId,
        latitude,
        longitude,
        timestamp: timestamp || new Date().toISOString()
      });
      
      console.log(`Location update from user ${userId} to user ${data.targetUserId}`);
    } catch (error) {
      console.error('Location update error:', error);
    }
  });

  socket.on('join-realtime-session', async (data) => {
    try {
      const { targetUserId } = data;
      const userId = socket.userId;
      
      const hasActiveSession = await RealtimeSession.hasActiveSession(userId, targetUserId);
      if (!hasActiveSession) {
        console.log(`No active session between users ${userId} and ${targetUserId}`);
        return;
      }
      
      socket.join(`session_${userId}_${targetUserId}`);
      socket.join(`session_${targetUserId}_${userId}`);
      
      console.log(`User ${userId} joined realtime session with ${targetUserId}`);
    } catch (error) {
      console.error('Join realtime session error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});