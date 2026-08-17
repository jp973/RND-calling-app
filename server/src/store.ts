export interface UserDevice {
  userId: string;
  token: string;
  tokenType: 'FCM' | 'APNS_VOIP';
  lastSeen: Date;
}

export interface CallRecord {
  serverCallId: string;
  callerId: string;
  calleeId: string;
  status: 'ringing' | 'answered' | 'connected' | 'declined' | 'ended' | 'missed';
  createdAt: Date;
  answeredAt?: Date;
  endedAt?: Date;
  timeoutTimer?: NodeJS.Timeout;
}

class InMemoryStore {
  // Map<userId, UserDevice>
  private devices = new Map<string, UserDevice>();

  // Map<serverCallId, CallRecord>
  private calls = new Map<string, CallRecord>();

  // ── Device Token Operations ──
  registerDevice(userId: string, token: string, tokenType: 'FCM' | 'APNS_VOIP') {
    this.devices.set(userId, {
      userId,
      token,
      tokenType,
      lastSeen: new Date(),
    });
    console.log(`[Store] Registered device for ${userId} (type: ${tokenType})`);
  }

  getDevice(userId: string): UserDevice | undefined {
    return this.devices.get(userId);
  }

  getAllUsers(): Array<{ userId: string; online: boolean }> {
    const list: Array<{ userId: string; online: boolean }> = [];
    for (const [userId, device] of this.devices.entries()) {
      const isOnline = Date.now() - device.lastSeen.getTime() < 3600 * 1000;
      list.push({ userId, online: isOnline });
    }
    return list;
  }

  // ── Call Record Operations ──
  createCall(serverCallId: string, callerId: string, calleeId: string): CallRecord {
    const call: CallRecord = {
      serverCallId,
      callerId,
      calleeId,
      status: 'ringing',
      createdAt: new Date(),
    };
    this.calls.set(serverCallId, call);
    return call;
  }

  getCall(serverCallId: string): CallRecord | undefined {
    return this.calls.get(serverCallId);
  }

  updateCallStatus(serverCallId: string, status: CallRecord['status']) {
    const call = this.calls.get(serverCallId);
    if (call) {
      call.status = status;
      if (status === 'answered' || status === 'connected') {
        call.answeredAt = new Date();
      }
      if (status === 'ended' || status === 'declined' || status === 'missed') {
        call.endedAt = new Date();
        if (call.timeoutTimer) {
          clearTimeout(call.timeoutTimer);
          call.timeoutTimer = undefined;
        }
      }
      console.log(`[Store] Call ${serverCallId} status -> ${status}`);
    }
    return call;
  }
}

export const store = new InMemoryStore();
