import { Server as SocketIOServer, Socket } from 'socket.io';
import { store } from './store';

interface RoomState {
  offer?: any;
  answer?: any;
  iceCandidates: any[];
}

export function setupSignaling(io: SocketIOServer) {
  // Map<roomId, RoomState>
  const rooms = new Map<string, RoomState>();

  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;
    console.log(`[Signaling] Socket connected: ${socket.id} (user: ${userId || 'anonymous'})`);

    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Join a specific call room (roomId = serverCallId)
    socket.on('join-room', ({ roomId }: { roomId: string }) => {
      socket.join(roomId);
      console.log(`[Signaling] Socket ${socket.id} joined room ${roomId}`);

      let state = rooms.get(roomId);
      if (!state) {
        state = { iceCandidates: [] };
        rooms.set(roomId, state);
      }

      // If an offer was already submitted by the caller before this peer joined, replay it immediately!
      if (state.offer) {
        console.log(`[Signaling] Replaying buffered offer to newly joined socket ${socket.id} in room ${roomId}`);
        socket.emit('offer', { offer: state.offer, from: 'buffer' });
      }

      // Replay any buffered ICE candidates
      if (state.iceCandidates.length > 0) {
        state.iceCandidates.forEach((candidate) => {
          socket.emit('ice-candidate', { candidate, from: 'buffer' });
        });
      }

      // Notify caller that callee has joined
      socket.to(roomId).emit('peer-joined', { socketId: socket.id });
    });

    // Leave room
    socket.on('leave-room', ({ roomId }: { roomId: string }) => {
      socket.leave(roomId);
      console.log(`[Signaling] Socket ${socket.id} left room ${roomId}`);
      socket.to(roomId).emit('peer-left', { socketId: socket.id });
      rooms.delete(roomId);
    });

    // WebRTC Offer Relay
    socket.on('offer', ({ roomId, offer }: { roomId: string; offer: any }) => {
      console.log(`[Signaling] Relaying offer in room ${roomId}`);
      let state = rooms.get(roomId);
      if (!state) {
        state = { iceCandidates: [] };
        rooms.set(roomId, state);
      }
      state.offer = offer;
      socket.to(roomId).emit('offer', { offer, from: socket.id });
    });

    // WebRTC Answer Relay
    socket.on('answer', ({ roomId, answer }: { roomId: string; answer: any }) => {
      console.log(`[Signaling] Relaying answer in room ${roomId}`);
      const state = rooms.get(roomId);
      if (state) {
        state.answer = answer;
      }
      socket.to(roomId).emit('answer', { answer, from: socket.id });
    });

    // ICE Candidate Relay
    socket.on('ice-candidate', ({ roomId, candidate }: { roomId: string; candidate: any }) => {
      let state = rooms.get(roomId);
      if (!state) {
        state = { iceCandidates: [] };
        rooms.set(roomId, state);
      }
      state.iceCandidates.push(candidate);
      socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id });
    });

    // Hangup Signal Relay
    socket.on('hangup', ({ roomId }: { roomId: string }) => {
      console.log(`[Signaling] Hangup signal received in room ${roomId}`);
      socket.to(roomId).emit('hangup', { roomId });
      const call = store.getCall(roomId);
      if (call) {
        if (call.timeoutTimer) {
          clearTimeout(call.timeoutTimer);
        }
        io.to(`user:${call.callerId}`).emit('hangup', { serverCallId: roomId });
        io.to(`user:${call.calleeId}`).emit('hangup', { serverCallId: roomId });
        store.updateCallStatus(roomId, 'ended');
      }
      rooms.delete(roomId);
    });

    socket.on('disconnect', () => {
      console.log(`[Signaling] Socket disconnected: ${socket.id}`);
    });
  });
}
