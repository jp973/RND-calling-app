import { Server as SocketIOServer, Socket } from 'socket.io';
import { store } from './store';

export function setupSignaling(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;
    console.log(`[Signaling] Socket connected: ${socket.id} (user: ${userId || 'anonymous'})`);

    // Track active user in socket room
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Join a specific call room (roomId = serverCallId)
    socket.on('join-room', ({ roomId }: { roomId: string }) => {
      socket.join(roomId);
      console.log(`[Signaling] Socket ${socket.id} joined room ${roomId}`);
      // Notify other peer in room
      socket.to(roomId).emit('peer-joined', { socketId: socket.id });
    });

    // Leave room
    socket.on('leave-room', ({ roomId }: { roomId: string }) => {
      socket.leave(roomId);
      console.log(`[Signaling] Socket ${socket.id} left room ${roomId}`);
      socket.to(roomId).emit('peer-left', { socketId: socket.id });
    });

    // WebRTC Offer Relay
    socket.on('offer', ({ roomId, offer }: { roomId: string; offer: any }) => {
      console.log(`[Signaling] Relaying offer in room ${roomId}`);
      socket.to(roomId).emit('offer', { offer, from: socket.id });
    });

    // WebRTC Answer Relay
    socket.on('answer', ({ roomId, answer }: { roomId: string; answer: any }) => {
      console.log(`[Signaling] Relaying answer in room ${roomId}`);
      socket.to(roomId).emit('answer', { answer, from: socket.id });
    });

    // ICE Candidate Relay
    socket.on('ice-candidate', ({ roomId, candidate }: { roomId: string; candidate: any }) => {
      socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id });
    });

    // Hangup Signal Relay
    socket.on('hangup', ({ roomId }: { roomId: string }) => {
      console.log(`[Signaling] Hangup signal received in room ${roomId}`);
      socket.to(roomId).emit('hangup');
      store.updateCallStatus(roomId, 'ended');
    });

    socket.on('disconnect', () => {
      console.log(`[Signaling] Socket disconnected: ${socket.id}`);
    });
  });
}
