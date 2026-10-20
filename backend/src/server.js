import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import socketHandler from './sockets/socketHandler.js';
import queueRoutes from './routes/queueRoutes.js';
import authRoutes from './routes/authRoutes.js';
import errorHandler from './middlewares/errorHandler.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// CORS middleware
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: clientUrl,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Body parser
app.use(express.json());

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible globally in express routes
app.set('io', io);

// Socket Handler connection routing
socketHandler(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Queue Cure 26 Backend server is healthy' });
});

// API Routes
app.use('/api', queueRoutes);
app.use('/api/auth', authRoutes);

// Centralized error handler middleware (must be registered last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
