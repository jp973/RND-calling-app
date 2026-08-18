/**
 * CallManager — Orchestrates the entire call lifecycle
 *
 * Bridges expo-callkit-telecom (native call UI) with our WebRTC
 * audio and backend API. This is the single coordination point.
 */
import * as Calls from 'expo-callkit-telecom';
import type { EventSubscription } from 'expo-modules-core';
import { api } from './api';
import { socketService } from './socket';
import { soundService } from './soundService';

export type CallState =
  | 'idle'
  | 'ringing_incoming'
  | 'ringing_outgoing'
  | 'connecting'
  | 'connected'
  | 'ended';

export interface ActiveCall {
  callId: string;           // OS-assigned UUID (CallSession.id)
  serverCallId: string;     // Our backend's call ID
  direction: 'incoming' | 'outgoing';
  remoteName: string;
  remoteId: string;
  state: CallState;
  startedAt?: Date;
  connectedAt?: Date;
}

type CallStateChangeCallback = (call: ActiveCall | null) => void;

class CallManager {
  private activeCall: ActiveCall | null = null;
  private listeners: Set<CallStateChangeCallback> = new Set();
  private eventSubscriptions: EventSubscription[] = [];
  private isSetup = false;

  /** Set up all native event listeners and socket signaling hooks */
  setup() {
    if (this.isSetup) return;
    this.isSetup = true;

    console.log('[CallManager] Setting up event listeners');

    // ─── Incoming call reported to OS ────────────────────
    this.eventSubscriptions.push(
      Calls.addIncomingCallReportedListener(async (event) => {
        console.log('[CallManager] Incoming call reported:', event.id);
        const session = await Calls.getActiveCallSession();
        const incoming = session?.incomingCallEvent;
        const serverCallId = incoming?.serverCallId || '';

        this.activeCall = {
          callId: event.id,
          serverCallId,
          direction: 'incoming',
          remoteName: incoming?.caller?.displayName || 'Unknown',
          remoteId: incoming?.caller?.id || '',
          state: 'ringing_incoming',
          startedAt: new Date(),
        };
        this.notifyListeners();

        // Join room early to receive real-time caller cancel/hangup events
        if (serverCallId) {
          socketService.joinRoom(serverCallId);
        }

        // Play incoming ringtone through speaker
        soundService.playIncomingRingtone();
      })
    );

    // ─── User answered the call ──────────────────────────
    this.eventSubscriptions.push(
      Calls.addCallAnsweredListener((event) => {
        console.log('[CallManager] Call answered:', event.id, 'requestId:', event.requestId);
        soundService.stop();

        if (this.activeCall && this.activeCall.callId === event.id) {
          this.activeCall.state = 'connected';
          this.activeCall.connectedAt = new Date();
          this.notifyListeners();

          // Notify backend
          api.answerCall(this.activeCall.serverCallId).catch(console.error);

          // Join signaling room for WebRTC
          socketService.joinRoom(this.activeCall.serverCallId);

          // Fulfill the answer with requestId
          Calls.fulfillIncomingCallConnected(event.requestId).catch((err) => {
            console.error('[CallManager] Failed to fulfill answer:', err);
          });
        }
      })
    );

    // ─── Call ended (decline, hangup, timeout, error) ────
    this.eventSubscriptions.push(
      Calls.addCallEndedListener((event) => {
        console.log('[CallManager] Native call ended:', event.id);
        soundService.stop();

        if (this.activeCall && this.activeCall.callId === event.id) {
          const wasRinging = this.activeCall.state === 'ringing_incoming';
          const serverCallId = this.activeCall.serverCallId;

          // Notify backend
          if (wasRinging) {
            api.declineCall(serverCallId).catch(console.error);
          } else {
            api.hangupCall(serverCallId).catch(console.error);
          }

          // Send hangup via socket & leave room
          socketService.sendHangup(serverCallId);
          socketService.leaveRoom(serverCallId);

          this.activeCall.state = 'ended';
          this.notifyListeners();

          setTimeout(() => {
            this.activeCall = null;
            this.notifyListeners();
          }, 1500);
        }
      })
    );

    // ─── Outgoing call started ───────────────────────────
    this.eventSubscriptions.push(
      Calls.addOutgoingCallStartedListener((event) => {
        console.log('[CallManager] Outgoing call started in OS:', event.id);
      })
    );

    // ─── Audio session activated ─────────────────────────
    this.eventSubscriptions.push(
      Calls.addAudioSessionActivatedListener((event) => {
        console.log('[CallManager] Audio session activated:', event.calls);
        // Only mark connected if we were already in connecting state (e.g. answered incoming call)
        // DO NOT prematurely transition outgoing calls or stop dial tone while still ringing!
        if (this.activeCall && this.activeCall.state === 'connecting') {
          soundService.stop();
          this.activeCall.state = 'connected';
          if (!this.activeCall.connectedAt) {
            this.activeCall.connectedAt = new Date();
          }
          this.notifyListeners();
        }
      })
    );

    // ─── Audio session deactivated ───────────────────────
    this.eventSubscriptions.push(
      Calls.addAudioSessionDeactivatedListener(() => {
        console.log('[CallManager] Audio session deactivated');
      })
    );

    // ─── Audio route changed ─────────────────────────────
    this.eventSubscriptions.push(
      Calls.addAudioRouteChangedListener((event) => {
        console.log('[CallManager] Audio route changed:', event.currentRoute);
      })
    );

    // ─── Mute action ─────────────────────────────────────
    this.eventSubscriptions.push(
      Calls.addSetMutedActionListener((event) => {
        console.log('[CallManager] Mute toggled:', event.isMuted);
      })
    );

    // ─── Call session updates ────────────────────────────
    this.eventSubscriptions.push(
      Calls.addCallSessionUpdatedListener((event) => {
        console.log('[CallManager] Session updated:', event.session.status);
      })
    );

    // ─── Reported call ended (from reportCallEnded) ──────
    this.eventSubscriptions.push(
      Calls.addReportedCallEndedListener((event) => {
        console.log('[CallManager] Reported call ended:', event.id, 'reason:', event.reason);
      })
    );

    // ─── Global Socket listeners for Remote Signaling ───
    this.attachSocketListeners();
  }

  /** Attach global socket handlers for remote hangup, answer, decline, etc. */
  private attachSocketListeners() {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on('hangup', () => {
      console.log('[CallManager] Remote hangup signal received over socket');
      this.handleRemoteHangup();
    });

    socket.on('call-declined', () => {
      console.log('[CallManager] Remote call-declined received over socket');
      this.handleRemoteDeclined();
    });

    socket.on('call-timeout', () => {
      console.log('[CallManager] Call timeout received over socket');
      this.handleRemoteTimeout();
    });
  }

  /** Remote peer hung up the call */
  handleRemoteHangup() {
    soundService.stop();
    if (this.activeCall) {
      const callId = this.activeCall.callId;
      const serverCallId = this.activeCall.serverCallId;

      try {
        Calls.reportCallEnded(callId, 'remoteEnded');
      } catch (e) {
        console.warn('[CallManager] reportCallEnded error:', e);
      }

      socketService.leaveRoom(serverCallId);

      this.activeCall.state = 'ended';
      this.notifyListeners();

      setTimeout(() => {
        this.activeCall = null;
        this.notifyListeners();
      }, 1500);
    }
  }

  /** Remote peer declined */
  handleRemoteDeclined() {
    soundService.stop();
    if (this.activeCall) {
      const callId = this.activeCall.callId;
      const serverCallId = this.activeCall.serverCallId;

      try {
        Calls.reportCallEnded(callId, 'remoteEnded');
      } catch (e) {
        console.warn('[CallManager] reportCallEnded error:', e);
      }

      socketService.leaveRoom(serverCallId);

      this.activeCall.state = 'ended';
      this.notifyListeners();

      setTimeout(() => {
        this.activeCall = null;
        this.notifyListeners();
      }, 1500);
    }
  }

  /** Call timed out with no answer */
  handleRemoteTimeout() {
    soundService.stop();
    if (this.activeCall) {
      const callId = this.activeCall.callId;
      const serverCallId = this.activeCall.serverCallId;

      try {
        Calls.reportCallEnded(callId, 'unanswered');
      } catch (e) {
        console.warn('[CallManager] reportCallEnded error:', e);
      }

      socketService.leaveRoom(serverCallId);

      this.activeCall.state = 'ended';
      this.notifyListeners();

      setTimeout(() => {
        this.activeCall = null;
        this.notifyListeners();
      }, 1500);
    }
  }

  // ─── Outgoing Call ───────────────────────────────────────

  async startOutgoingCall(calleeId: string, calleeName: string, userId: string) {
    console.log('[CallManager] Starting outgoing call to:', calleeName);

    try {
      // 1. Tell backend to send FCM push to callee
      const result = await api.initiateCall(userId, calleeId);
      const serverCallId = result.serverCallId;

      // 2. Start outgoing call in the native Telecom UI
      const callId = await Calls.startOutgoingCall(
        {
          id: calleeId,
          displayName: calleeName,
        },
        {
          hasVideo: false,
        }
      );

      // 3. Track the call in ringing_outgoing state
      this.activeCall = {
        callId,
        serverCallId,
        direction: 'outgoing',
        remoteName: calleeName,
        remoteId: calleeId,
        state: 'ringing_outgoing',
        startedAt: new Date(),
        connectedAt: undefined,
      };
      this.notifyListeners();

      // 4. Join signaling room
      socketService.joinRoom(serverCallId);

      // 5. Play outgoing dial tone ("tuuut... tuuut...")
      await soundService.playRingback();

      // 6. Listen for callee's answer via socket
      const socket = socketService.getSocket();
      if (socket) {
        // Ensure socket handlers are attached
        this.attachSocketListeners();

        socket.once('call-answered', () => {
          console.log('[CallManager] Callee answered — connecting audio');
          soundService.stop();
          if (this.activeCall) {
            try {
              Calls.reportOutgoingCallConnected(this.activeCall.callId);
            } catch (e) {
              console.warn('[CallManager] reportOutgoingCallConnected error:', e);
            }
            this.activeCall.state = 'connected';
            this.activeCall.connectedAt = new Date();
            this.notifyListeners();
          }
        });
      }

      return serverCallId;
    } catch (error) {
      soundService.stop();
      console.error('[CallManager] Failed to start outgoing call:', error);
      throw error;
    }
  }

  // ─── Answer (In-App) ──────────────────────────────────

  async answerCall() {
    if (!this.activeCall) return;
    console.log('[CallManager] In-app answer for call:', this.activeCall.callId);
    soundService.stop();
    try {
      await Calls.answerCall(this.activeCall.callId);
      this.activeCall.state = 'connected';
      this.activeCall.connectedAt = new Date();
      this.notifyListeners();
    } catch (error) {
      console.error('[CallManager] Failed to answer call via API:', error);
      // Fallback: connect directly
      this.activeCall.state = 'connected';
      this.activeCall.connectedAt = new Date();
      this.notifyListeners();
      api.answerCall(this.activeCall.serverCallId).catch(console.error);
      socketService.joinRoom(this.activeCall.serverCallId);
    }
  }

  // ─── Hangup ──────────────────────────────────────────────

  async hangup() {
    if (!this.activeCall) return;

    console.log('[CallManager] Hanging up:', this.activeCall.callId);
    soundService.stop();

    const serverCallId = this.activeCall.serverCallId;
    const callId = this.activeCall.callId;

    try {
      await Calls.endCall(callId);
    } catch (error) {
      console.error('[CallManager] Hangup error from Calls.endCall:', error);
    }

    // Always ensure backend and signaling are informed
    api.hangupCall(serverCallId).catch(console.error);
    socketService.sendHangup(serverCallId);
    socketService.leaveRoom(serverCallId);

    this.activeCall.state = 'ended';
    this.notifyListeners();

    setTimeout(() => {
      this.activeCall = null;
      this.notifyListeners();
    }, 1500);
  }

  // ─── Mute ────────────────────────────────────────────────

  async toggleMute(muted: boolean) {
    if (!this.activeCall) return;
    await Calls.setMuted(this.activeCall.callId, muted);
  }

  // ─── Speaker ─────────────────────────────────────────────

  async toggleSpeaker(speaker: boolean) {
    Calls.setAudioSessionPortOverride(speaker);
  }

  // ─── Getters ─────────────────────────────────────────────

  getActiveCall(): ActiveCall | null {
    return this.activeCall;
  }

  // ─── Listeners ───────────────────────────────────────────

  addListener(callback: CallStateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    const call = this.activeCall ? { ...this.activeCall } : null;
    this.listeners.forEach((cb) => cb(call));
  }

  // ─── Cleanup ─────────────────────────────────────────────

  teardown() {
    this.eventSubscriptions.forEach((sub) => sub.remove());
    this.eventSubscriptions = [];
    this.listeners.clear();
    this.isSetup = false;
  }
}

export const callManager = new CallManager();
