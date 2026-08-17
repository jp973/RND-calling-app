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

  /** Set up all native event listeners — call once at app start */
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

        this.activeCall = {
          callId: event.id,
          serverCallId: incoming?.serverCallId || '',
          direction: 'incoming',
          remoteName: incoming?.caller?.displayName || 'Unknown',
          remoteId: incoming?.caller?.id || '',
          state: 'ringing_incoming',
          startedAt: new Date(),
        };
        this.notifyListeners();
      })
    );

    // ─── User answered the call ──────────────────────────
    this.eventSubscriptions.push(
      Calls.addCallAnsweredListener((event) => {
        console.log('[CallManager] Call answered:', event.id, 'requestId:', event.requestId);

        if (this.activeCall && this.activeCall.callId === event.id) {
          this.activeCall.state = 'connecting';
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
        console.log('[CallManager] Call ended:', event.id);

        if (this.activeCall && this.activeCall.callId === event.id) {
          const wasRinging = this.activeCall.state === 'ringing_incoming';

          // Notify backend
          if (wasRinging) {
            api.declineCall(this.activeCall.serverCallId).catch(console.error);
          } else {
            api.hangupCall(this.activeCall.serverCallId).catch(console.error);
          }

          // Send hangup via socket
          socketService.sendHangup(this.activeCall.serverCallId);
          socketService.leaveRoom(this.activeCall.serverCallId);

          this.activeCall.state = 'ended';
          this.notifyListeners();

          // Clear after brief delay so UI can show "ended" state
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
        console.log('[CallManager] Outgoing call started:', event.id);
      })
    );

    // ─── Audio session activated ─────────────────────────
    this.eventSubscriptions.push(
      Calls.addAudioSessionActivatedListener((event) => {
        console.log('[CallManager] Audio session activated:', event.calls);
        // WebRTC audio is now enabled by the module
        if (this.activeCall) {
          this.activeCall.state = 'connected';
          this.activeCall.connectedAt = new Date();
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
  }

  // ─── Outgoing Call ───────────────────────────────────────

  async startOutgoingCall(calleeId: string, calleeName: string, userId: string) {
    console.log('[CallManager] Starting outgoing call to:', calleeName);

    try {
      // 1. Tell our backend to send FCM push to callee
      const result = await api.initiateCall(userId, calleeId);
      const serverCallId = result.serverCallId;

      // 2. Start outgoing call in the native UI
      const callId = await Calls.startOutgoingCall(
        {
          id: calleeId,
          displayName: calleeName,
        },
        {
          hasVideo: false,
        }
      );

      // 3. Track the call
      this.activeCall = {
        callId,
        serverCallId,
        direction: 'outgoing',
        remoteName: calleeName,
        remoteId: calleeId,
        state: 'ringing_outgoing',
        startedAt: new Date(),
      };
      this.notifyListeners();

      // 4. Join signaling room
      socketService.joinRoom(serverCallId);

      // 5. Listen for callee's answer via socket
      const socket = socketService.getSocket();
      if (socket) {
        socket.once('call-answered', () => {
          console.log('[CallManager] Callee answered — reporting connected');
          if (this.activeCall) {
            Calls.reportOutgoingCallConnected(this.activeCall.callId);
            this.activeCall.state = 'connecting';
            this.notifyListeners();
          }
        });

        socket.once('call-declined', () => {
          console.log('[CallManager] Callee declined');
          if (this.activeCall) {
            Calls.reportCallEnded(this.activeCall.callId, 'remoteEnded');
            this.activeCall.state = 'ended';
            this.notifyListeners();
            setTimeout(() => {
              this.activeCall = null;
              this.notifyListeners();
            }, 1500);
          }
        });

        socket.once('call-timeout', () => {
          console.log('[CallManager] Call timed out — no answer');
          if (this.activeCall) {
            Calls.reportCallEnded(this.activeCall.callId, 'unanswered');
            this.activeCall.state = 'ended';
            this.notifyListeners();
            setTimeout(() => {
              this.activeCall = null;
              this.notifyListeners();
            }, 1500);
          }
        });
      }

      return serverCallId;
    } catch (error) {
      console.error('[CallManager] Failed to start outgoing call:', error);
      throw error;
    }
  }

  // ─── Hangup ──────────────────────────────────────────────

  async hangup() {
    if (!this.activeCall) return;

    console.log('[CallManager] Hanging up:', this.activeCall.callId);

    try {
      await Calls.endCall(this.activeCall.callId);
    } catch (error) {
      console.error('[CallManager] Hangup error:', error);
      // Force cleanup even if native call fails
      if (this.activeCall) {
        api.hangupCall(this.activeCall.serverCallId).catch(console.error);
        socketService.sendHangup(this.activeCall.serverCallId);
        socketService.leaveRoom(this.activeCall.serverCallId);
        this.activeCall.state = 'ended';
        this.notifyListeners();
        setTimeout(() => {
          this.activeCall = null;
          this.notifyListeners();
        }, 1500);
      }
    }
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
