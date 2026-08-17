import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class FcmService {
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    const serviceAccountPath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      path.resolve(process.cwd(), 'service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.isInitialized = true;
        console.log('[FCM] Firebase Admin SDK initialized successfully with service account');
      } catch (err) {
        console.error('[FCM] Failed to parse service-account.json:', err);
      }
    } else {
      console.warn(
        `[FCM] ⚠️ Warning: service-account.json not found at ${serviceAccountPath}.\n` +
        `Place your Firebase Service Account JSON file in the server directory to enable real FCM pushes to Android devices.`
      );
    }
  }

  /**
   * Send the native incomingCall payload formatted for expo-callkit-telecom
   */
  async sendIncomingCallPush(
    deviceToken: string,
    serverCallId: string,
    callerId: string,
    callerName: string,
    serverUrl?: string
  ): Promise<boolean> {
    const eventId = uuidv4();
    const startedAt = new Date().toISOString();

    // The inner IncomingCallEvent object required by expo-callkit-telecom
    const incomingCallObj = {
      eventId,
      serverCallId,
      hasVideo: false,
      startedAt,
      caller: {
        id: callerId,
        displayName: callerName,
      },
      metadata: {
        serverUrl: serverUrl || process.env.SERVER_PUBLIC_URL || '',
      },
    };

    // Android FCM requires data block with string values
    const payload = {
      token: deviceToken,
      data: {
        messageType: 'incomingCall',
        incomingCall: JSON.stringify(incomingCallObj),
      },
      android: {
        priority: 'high' as const,
      },
    };

    console.log(`[FCM] Sending VoIP push to device token: ${deviceToken.substring(0, 16)}...`);
    console.log(`[FCM] Payload preview:`, JSON.stringify(incomingCallObj, null, 2));

    if (!this.isInitialized) {
      console.warn('[FCM] Simulation mode: Push not sent because service account is not yet loaded.');
      return false;
    }

    try {
      const response = await admin.messaging().send(payload);
      console.log('[FCM] Push sent successfully! Message ID:', response);
      return true;
    } catch (error) {
      console.error('[FCM] Error sending FCM message:', error);
      throw error;
    }
  }
}

export const fcmService = new FcmService();
