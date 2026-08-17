import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { createCallRouter } from './routes/calls';
import { setupSignaling } from './signaling';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

// CORS setup to allow mobile clients
app.use(cors());
app.use(express.json());

// Setup Socket.IO for WebRTC signaling
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

setupSignaling(io);

// Mount API routes
app.use('/api', createCallRouter(io));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

server.listen(port, () => {
  console.log(`=============================================`);
  console.log(`🚀 Expo Call Server running on port ${port}`);
  console.log(`📡 WebRTC Signaling & FCM Dispatch Ready`);
  console.log(`=============================================`);
});
