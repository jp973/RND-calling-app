/**
 * usePushToken — Registers for VoIP push and sends token to backend
 */
import { useEffect, useState, useCallback } from 'react';
import {
  registerVoIPPush,
  useVoIPPushToken,
} from 'expo-callkit-telecom';
import { api } from '../services/api';

export function usePushToken(userId: string | null) {
  const voip = useVoIPPushToken();
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Register for VoIP push on mount
  useEffect(() => {
    registerVoIPPush();
    console.log('[PushToken] Registered for VoIP push');
  }, []);

  const sendTokenToServer = useCallback(async (targetUserId?: string) => {
    const uid = targetUserId || userId;
    if (!voip?.token || !uid) return;

    try {
      console.log(`[PushToken] Sending ${voip.type} token for user ${uid} to ${api['baseUrl']}...`);
      await api.registerToken(uid, voip.token, voip.type);
      console.log(`[PushToken] ✅ Token successfully registered for ${uid}`);
      setRegistered(true);
      setError(null);
    } catch (err: any) {
      console.warn(`[PushToken] ⚠️ Failed to register token for ${uid}:`, err?.message);
      setError(err?.message || 'Failed to register');
      setRegistered(false);
    }
  }, [voip, userId]);

  // When token or userId changes, automatically sync to server
  useEffect(() => {
    if (voip?.token && userId) {
      sendTokenToServer(userId);
    }
  }, [voip?.token, userId, sendTokenToServer]);

  return {
    token: voip?.token || null,
    tokenType: voip?.type || null,
    registered,
    error,
    sendTokenToServer,
  };
}
