/**
 * useWebRTC — Peer-to-peer audio via WebRTC
 *
 * Handles SDP offer/answer exchange and ICE candidate relay
 * via Socket.IO. The actual audio session is managed by
 * expo-callkit-telecom (which owns RTCAudioSession).
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from '@livekit/react-native-webrtc';
import { socketService } from '../services/socket';
import { ICE_SERVERS } from '../utils/constants';

interface UseWebRTCOptions {
  roomId: string | null;
  isCaller: boolean;
  enabled: boolean;
}

export function useWebRTC({ roomId, isCaller, enabled }: UseWebRTCOptions) {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>('new');

  // ─── Create Peer Connection ────────────────────────────
  const createPeerConnection = useCallback(() => {
    if (peerConnection.current) return peerConnection.current;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.addEventListener('icecandidate', (event: any) => {
      if (event.candidate && roomId) {
        socketService.sendIceCandidate(roomId, event.candidate.toJSON());
      }
    });

    pc.addEventListener('track', (event: any) => {
      console.log('[WebRTC] Remote track received');
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    });

    pc.addEventListener('connectionstatechange', () => {
      const state = pc.connectionState;
      console.log('[WebRTC] Connection state:', state);
      setConnectionState(state);
    });

    pc.addEventListener('iceconnectionstatechange', () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState);
    });

    peerConnection.current = pc;
    return pc;
  }, [roomId]);

  // ─── Get Local Audio Stream ────────────────────────────
  const getLocalStream = useCallback(async () => {
    if (localStream.current) return localStream.current;

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStream.current = stream as MediaStream;
      console.log('[WebRTC] Local audio stream acquired');
      return stream as MediaStream;
    } catch (error) {
      console.error('[WebRTC] Failed to get local stream:', error);
      throw error;
    }
  }, []);

  // ─── Start the WebRTC Connection ───────────────────────
  const startConnection = useCallback(async () => {
    if (!roomId) return;

    console.log('[WebRTC] Starting connection, isCaller:', isCaller);

    const pc = createPeerConnection();
    const stream = await getLocalStream();

    // Add local tracks to peer connection
    stream.getTracks().forEach((track: any) => {
      pc.addTrack(track, stream);
    });

    const socket = socketService.getSocket();
    if (!socket) {
      console.error('[WebRTC] No socket connection');
      return;
    }

    if (isCaller) {
      // Caller creates offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);
      socketService.sendOffer(roomId, offer);
      console.log('[WebRTC] Offer sent');

      // Wait for answer
      socket.on('answer', async ({ answer }: any) => {
        console.log('[WebRTC] Answer received');
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });
    } else {
      // Callee waits for offer
      socket.on('offer', async ({ offer }: any) => {
        console.log('[WebRTC] Offer received');
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketService.sendAnswer(roomId, answer);
        console.log('[WebRTC] Answer sent');
      });
    }

    // Handle ICE candidates from remote
    socket.on('ice-candidate', async ({ candidate }: any) => {
      try {
        if (candidate && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error('[WebRTC] Failed to add ICE candidate:', error);
      }
    });

    // Handle remote hangup
    socket.on('hangup', () => {
      console.log('[WebRTC] Remote hangup received');
      cleanup();
    });
  }, [roomId, isCaller, createPeerConnection, getLocalStream]);

  // ─── Cleanup ───────────────────────────────────────────
  const cleanup = useCallback(() => {
    console.log('[WebRTC] Cleaning up');

    // Stop local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach((track: any) => track.stop());
      localStream.current = null;
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    setRemoteStream(null);
    setConnectionState('closed');

    // Remove socket listeners
    const socket = socketService.getSocket();
    if (socket) {
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('hangup');
    }
  }, []);

  // ─── Auto-start when enabled ───────────────────────────
  useEffect(() => {
    if (enabled && roomId) {
      startConnection().catch(console.error);
    }

    return () => {
      if (!enabled || !roomId) {
        cleanup();
      }
    };
  }, [enabled, roomId]);

  // ─── Cleanup on unmount ────────────────────────────────
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    remoteStream,
    connectionState,
    cleanup,
    startConnection,
  };
}
