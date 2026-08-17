/**
 * App-wide constants (non-theme values)
 */

// Server URL — your Mac's Wi-Fi IP for direct testing on real Android phone
export const SERVER_URL = 'http://192.168.0.171:3001';

// WebRTC STUN servers (free, public)
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// App info
export const APP_NAME = 'ExpoCall';
export const ANDROID_PACKAGE = 'com.expocallingapp.android';
