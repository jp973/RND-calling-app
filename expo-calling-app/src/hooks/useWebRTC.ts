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
import { callManager } from '../services/callManager';
import { ICE_SERVERS } from '../utils/constants';

interface UseWebRTCOptions {
  roomId: string | null;
  isCaller: boolean;
  enabled: boolean;
}

export function useWebRTC({ roomId, isCaller, enabled }: UseWebRTCOptions) {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const pendingCandidates = useRef<any[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>('new');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // ─── Set Mute / Unmute Local Microphone ────────────────
  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track: any) => {
        track.enabled = !muted;
        console.log(`[WebRTC] 🎤 Microphone track ${track.id} set enabled = ${!muted}`);
      });
    }
  }, []);

  // ─── Process Buffered ICE Candidates ───────────────────
  const processPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) return;
    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift();
      if (candidate) {
        try {
          console.log('[WebRTC] Adding buffered ICE candidate');
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Error adding buffered ICE candidate:', err);
        }
      }
    }
  }, []);

  // ─── Create Peer Connection ────────────────────────────
  const createPeerConnection = useCallback(() => {
    if (peerConnection.current) return peerConnection.current;

    console.log('[WebRTC] Initializing RTCPeerConnection with ICE servers:', ICE_SERVERS);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.addEventListener('icecandidate', (event: any) => {
      if (event.candidate && roomId) {
        console.log('[WebRTC] Local ICE candidate generated');
        socketService.sendIceCandidate(roomId, event.candidate.toJSON());
      }
    });

    pc.addEventListener('track', (event: any) => {
      console.log('[WebRTC] 🎙️ Remote audio track received!');
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        stream.getTracks().forEach((track: any) => {
          track.enabled = true;
          console.log('[WebRTC] Remote track enabled:', track.kind, track.id);
        });
        setRemoteStream(stream);
      }
    });

    pc.addEventListener('connectionstatechange', () => {
      const state = pc.connectionState;
      console.log('[WebRTC] Peer Connection state changed:', state);
      setConnectionState(state);
    });

    pc.addEventListener('iceconnectionstatechange', () => {
      console.log('[WebRTC] ICE Connection state:', pc.iceConnectionState);
    });

    peerConnection.current = pc;
    return pc;
  }, [roomId]);

  // ─── Get Local Audio Stream ────────────────────────────
  const getLocalStream = useCallback(async () => {
    if (localStream.current) return localStream.current;

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as any,
        video: false,
      });
      localStream.current = stream as MediaStream;
      console.log('[WebRTC] ✅ Local microphone stream acquired');
      return stream as MediaStream;
    } catch (error) {
      console.error('[WebRTC] ❌ Failed to get local microphone stream:', error);
      throw error;
    }
  }, []);

  // ─── Start the WebRTC Connection ───────────────────────
  const startConnection = useCallback(async () => {
    if (!roomId) return;

    console.log('[WebRTC] 🚀 Starting connection (isCaller:', isCaller, 'roomId:', roomId, ')');

    const pc = createPeerConnection();
    const stream = await getLocalStream();

    // Add local tracks to peer connection with current mute state
    stream.getTracks().forEach((track: any) => {
      if (track.kind === 'audio') {
        track.enabled = !isMuted;
      } else {
        track.enabled = true;
      }
      pc.addTrack(track, stream);
      console.log('[WebRTC] Added local track to peer connection:', track.kind, 'enabled:', track.enabled);
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
      console.log('[WebRTC] 📤 Caller SDP Offer sent');

      // If peer joins after caller is ready, re-send the offer
      socket.on('peer-joined', () => {
        if (pc.localDescription) {
          console.log('[WebRTC] Peer joined room — re-sending SDP offer');
          socketService.sendOffer(roomId, pc.localDescription.toJSON() as any);
        }
      });

      // Wait for answer from callee
      socket.on('answer', async ({ answer }: any) => {
        console.log('[WebRTC] 📥 Callee SDP Answer received');
        try {
          if (pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('[WebRTC] ✅ Remote description set from Answer');
            await processPendingCandidates(pc);
          }
        } catch (e) {
          console.warn('[WebRTC] Error setting remote description from answer:', e);
        }
      });
    } else {
      // Callee waits for offer from caller
      socket.on('offer', async ({ offer }: any) => {
        console.log('[WebRTC] 📥 Caller SDP Offer received');
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          console.log('[WebRTC] ✅ Remote description set from Offer');
          await processPendingCandidates(pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketService.sendAnswer(roomId, answer);
          console.log('[WebRTC] 📤 Callee SDP Answer sent');
        } catch (e) {
          console.warn('[WebRTC] Error responding to offer:', e);
        }
      });
    }

    // Handle ICE candidates from remote peer (or replayed buffer from server)
    socket.on('ice-candidate', async ({ candidate }: any) => {
      if (!candidate) return;
      if (!pc.remoteDescription) {
        console.log('[WebRTC] Buffering remote ICE candidate until remote description is ready');
        pendingCandidates.current.push(candidate);
      } else {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] ✅ Added remote ICE candidate');
        } catch (error) {
          console.error('[WebRTC] Failed to add ICE candidate:', error);
        }
      }
    });

    // Handle remote hangup
    socket.on('hangup', () => {
      console.log('[WebRTC] Remote hangup received');
      cleanup();
      callManager.handleRemoteHangup();
    });
  }, [roomId, isCaller, isMuted, createPeerConnection, getLocalStream, processPendingCandidates]);

  // ─── Cleanup ───────────────────────────────────────────
  const cleanup = useCallback(() => {
    console.log('[WebRTC] Cleaning up connection');

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

    pendingCandidates.current = [];
    setRemoteStream(null);
    setConnectionState('closed');

    // Remove socket listeners
    const socket = socketService.getSocket();
    if (socket) {
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('hangup');
      socket.off('peer-joined');
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
    setMuted,
    isMuted,
  };
}
