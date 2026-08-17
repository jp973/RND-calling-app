/**
 * usePushToken — Registers for VoIP push and sends token to backend
 */
import { useEffect, useState } from 'react';
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

  // When token arrives, send to backend
  useEffect(() => {
    if (!voip || !userId) return;

    console.log(`[PushToken] Got ${voip.type} token:`, voip.token.substring(0, 20) + '...');

    api
      .registerToken(userId, voip.token, voip.type)
      .then(() => {
        console.log('[PushToken] Token registered with server');
        setRegistered(true);
        setError(null);
      })
      .catch((err) => {
        console.error('[PushToken] Failed to register token:', err);
        setError(err.message);
      });
  }, [voip, userId]);

  return {
    token: voip?.token || null,
    tokenType: voip?.type || null,
    registered,
    error,
  };
}
