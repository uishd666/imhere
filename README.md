# ImHere Backend API

A Node.js backend API for sharing user locations in real-time using MySQL database.

## Features

- User registration and authentication
- Location updates and sharing between users
- Follow/unfollow user system
- Real-time location updates via WebSocket
- Secure password hashing with bcrypt
- JWT-based authentication
- MySQL database integration

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables in `.env`:

3. Make sure MySQL database is running and the `location_app` database exists

4. Start the server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (requires auth)
- `GET /api/users/all` - Get all users

### Location Management
- `POST /api/locations/update` - Update user's current location (requires auth)
- `POST /api/locations/share` - Share current location (requires auth)
- `GET /api/locations/shared-with-me` - Get locations from users you follow (requires auth)
- `GET /api/locations/user/:userId` - Get specific user's latest location (requires auth)

### Follow System
- `POST /api/locations/follow` - Follow a user to see their location (requires auth)
- `DELETE /api/locations/unfollow/:targetId` - Unfollow a user (requires auth)
- `GET /api/locations/following` - Get list of users you follow (requires auth)
- `GET /api/locations/followers` - Get list of users following you (requires auth)

## WebSocket Events

### Client to Server
- `join-room` - Join user's personal room (userId)
- `location-update` - Send real-time location update to followers

### Server to Client
- `location-received` - Receive real-time location from followed users

## Database Schema

### Users
- id (INT, Primary Key, Auto Increment)
- username (VARCHAR(50), Unique)
- password (VARCHAR(255), Hashed)
- created_at (TIMESTAMP)

### Locations
- id (INT, Primary Key, Auto Increment)
- user_id (INT, Foreign Key to users.id)
- lat (DECIMAL(10,8))
- lng (DECIMAL(11,8))
- created_at (TIMESTAMP)

### Relations
- id (INT, Primary Key, Auto Increment)
- target_id (INT, Foreign Key to users.id - user being followed)
- watcher_id (INT, Foreign Key to users.id - user following)
- created_at (TIMESTAMP)

## Usage Example

1. Register a user:
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "password123"}'
```

2. Login:
```bash
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "password123"}'
```

3. Follow another user:
```bash
curl -X POST http://localhost:3001/api/locations/follow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"targetId": 2}'
```

4. Update your location:
```bash
curl -X POST http://localhost:3001/api/locations/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"lat": 40.7128, "lng": -74.0060}'
```

5. Get locations from users you follow:
```bash
curl -X GET http://localhost:3001/api/locations/shared-with-me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```