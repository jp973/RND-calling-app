/**
 * useCallSession — React hook wrapping CallManager state
 */
import { useState, useEffect, useCallback } from 'react';
import { callManager, ActiveCall, CallState } from '../services/callManager';

export function useCallSession() {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(
    callManager.getActiveCall()
  );

  useEffect(() => {
    const unsubscribe = callManager.addListener((call) => {
      setActiveCall(call);
    });
    return unsubscribe;
  }, []);

  const hangup = useCallback(async () => {
    await callManager.hangup();
  }, []);

  const toggleMute = useCallback(async (muted: boolean) => {
    await callManager.toggleMute(muted);
  }, []);

  const toggleSpeaker = useCallback(async (speaker: boolean) => {
    await callManager.toggleSpeaker(speaker);
  }, []);

  const startCall = useCallback(
    async (calleeId: string, calleeName: string, userId: string) => {
      return callManager.startOutgoingCall(calleeId, calleeName, userId);
    },
    []
  );

  const answerCall = useCallback(async () => {
    await callManager.answerCall();
  }, []);

  return {
    activeCall,
    isInCall: activeCall !== null && activeCall.state !== 'ended',
    isRinging:
      activeCall?.state === 'ringing_incoming' ||
      activeCall?.state === 'ringing_outgoing',
    isConnected: activeCall?.state === 'connected',
    answerCall,
    hangup,
    toggleMute,
    toggleSpeaker,
    startCall,
  };
}
