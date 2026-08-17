/**
 * Socket.IO client singleton — used for WebRTC signaling
 */
import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from '../utils/constants';

class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;

  constructor() {
    this.serverUrl = SERVER_URL;
  }

  setServerUrl(url: string) {
    this.serverUrl = url;
  }

  /** Connect to the signaling server */
  connect(userId: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(this.serverUrl, {
      transports: ['websocket'],
      query: { userId },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    return this.socket;
  }

  /** Get the current socket instance */
  getSocket(): Socket | null {
    return this.socket;
  }

  /** Join a call room for WebRTC signaling */
  joinRoom(roomId: string) {
    this.socket?.emit('join-room', { roomId });
    console.log('[Socket] Joined room:', roomId);
  }

  /** Leave a call room */
  leaveRoom(roomId: string) {
    this.socket?.emit('leave-room', { roomId });
    console.log('[Socket] Left room:', roomId);
  }

  /** Send WebRTC offer */
  sendOffer(roomId: string, offer: RTCSessionDescriptionInit) {
    this.socket?.emit('offer', { roomId, offer });
  }

  /** Send WebRTC answer */
  sendAnswer(roomId: string, answer: RTCSessionDescriptionInit) {
    this.socket?.emit('answer', { roomId, answer });
  }

  /** Send ICE candidate */
  sendIceCandidate(roomId: string, candidate: RTCIceCandidateInit) {
    this.socket?.emit('ice-candidate', { roomId, candidate });
  }

  /** Send hangup signal */
  sendHangup(roomId: string) {
    this.socket?.emit('hangup', { roomId });
  }

  /** Disconnect from server */
  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      console.log('[Socket] Fully disconnected');
    }
  }
}

export const socketService = new SocketService();
