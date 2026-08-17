import type { ExpoConfig } from 'expo/config';

const ANDROID_PACKAGE = 'com.expocallingapp.android';

const config: ExpoConfig = {
  name: 'ExpoCall',
  slug: 'expo-calling-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',

  android: {
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#0F0F1A',
    },
    package: ANDROID_PACKAGE,
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.MANAGE_OWN_CALLS',
      'android.permission.POST_NOTIFICATIONS',
    ],
    // google-services.json must be placed in project root
    googleServicesFile: './google-services.json',
  },

  plugins: [
    // ─── expo-callkit-telecom (native call UI + FCM parsing) ───
    [
      'expo-callkit-telecom',
      {
        incomingCallTimeout: 45,
        outgoingCallTimeout: 60,
        fulfillAnswerCallTimeout: 30,
        microphonePermission: 'ExpoCall needs your microphone to make voice calls.',
        androidEventReceiver: '.CallEndedReceiver',
      },
    ],
    // ─── expo-notifications (peer dep for Android FCM) ─────────
    [
      'expo-notifications',
      {
        icon: './assets/android-icon-foreground.png',
        color: '#6C63FF',
      },
    ],
    // ─── Local plugin: inject CallEndedReceiver.kt ─────────────
    './plugins/withCallEndedReceiver',
  ],
};

export default config;
