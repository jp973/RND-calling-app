import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Server as SocketIOServer } from 'socket.io';
import { store } from '../store';
import { fcmService } from '../services/fcm';

export function createCallRouter(io: SocketIOServer): Router {
  const router = Router();

  // ── Register Push Token ──
  router.post('/register-token', (req, res) => {
    const { userId, token, tokenType } = req.body;
    if (!userId || !token) {
      return res.status(400).json({ error: 'userId and token are required' });
    }

    store.registerDevice(userId, token, tokenType || 'FCM');
    return res.json({ success: true, message: `Token registered for ${userId}` });
  });

  // ── List Users ──
  router.get('/users', (req, res) => {
    const users = store.getAllUsers();
    return res.json({ users });
  });

  // ── Initiate Call (Triggers FCM Push) ──
  router.post('/initiate-call', async (req, res) => {
    const { callerId, calleeId } = req.body;
    if (!callerId || !calleeId) {
      return res.status(400).json({ error: 'callerId and calleeId are required' });
    }

    const serverCallId = uuidv4();
    const call = store.createCall(serverCallId, callerId, calleeId);

    const calleeDevice = store.getDevice(calleeId);
    if (!calleeDevice) {
      console.warn(`[API] Callee ${calleeId} has no registered push token`);
      return res.status(404).json({
        error: `User ${calleeId} is not registered or has no push token`,
        serverCallId,
      });
    }

    // Lookup caller display name
    const callerName = callerId === 'user_a' ? 'Alice' : callerId === 'user_b' ? 'Bob' : callerId;

    try {
      // Send high-priority FCM data message to callee's device
      await fcmService.sendIncomingCallPush(
        calleeDevice.token,
        serverCallId,
        callerId,
        callerName
      );

      // Set 45-second server-side timeout
      call.timeoutTimer = setTimeout(() => {
        const current = store.getCall(serverCallId);
        if (current && current.status === 'ringing') {
          console.log(`[CallTimeout] Call ${serverCallId} timed out after 45s`);
          store.updateCallStatus(serverCallId, 'missed');
          // Notify caller via Socket.IO
          io.to(`user:${callerId}`).emit('call-timeout', { serverCallId });
          io.to(serverCallId).emit('call-timeout', { serverCallId });
        }
      }, 45000);

      return res.json({ success: true, serverCallId });
    } catch (err: any) {
      console.error('[API] Failed to dispatch call push:', err);
      return res.status(500).json({ error: 'Failed to dispatch push notification', details: err?.message });
    }
  });

  // ── Answer Call ──
  router.post('/answer', (req, res) => {
    const { serverCallId } = req.body;
    const call = store.updateCallStatus(serverCallId, 'answered');
    if (call) {
      // Notify caller that callee picked up
      io.to(`user:${call.callerId}`).emit('call-answered', { serverCallId });
      io.to(serverCallId).emit('call-answered', { serverCallId });
    }
    return res.json({ success: true, status: 'answered' });
  });

  // ── Decline Call ──
  router.post('/decline', (req, res) => {
    const { serverCallId, reason } = req.body;
    console.log(`[API] Call ${serverCallId} declined (reason: ${reason || 'normal'})`);
    const call = store.updateCallStatus(serverCallId, 'declined');
    if (call) {
      // Notify caller immediately so their phone stops ringing
      io.to(`user:${call.callerId}`).emit('call-declined', { serverCallId, reason });
      io.to(serverCallId).emit('call-declined', { serverCallId, reason });
    }
    return res.json({ success: true, status: 'declined' });
  });

  // ── Hangup Call ──
  router.post('/hangup', (req, res) => {
    const { serverCallId } = req.body;
    const call = store.updateCallStatus(serverCallId, 'ended');
    if (call) {
      io.to(serverCallId).emit('hangup', { serverCallId });
    }
    return res.json({ success: true, status: 'ended' });
  });

  return router;
}
