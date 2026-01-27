const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const db = require('./config/database');

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

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

app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('location-update', (data) => {
    socket.to(data.targetUserId).emit('location-received', {
      fromUserId: data.fromUserId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: data.timestamp
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});