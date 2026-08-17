# 📱 Expo Android Calling App (VoIP Push + WebRTC)

A full-stack Android voice calling application built with **React Native / Expo** and **Node.js**.

- 📞 **Native Incoming Call UI:** Rings with native answer/decline full-screen UI on Android via `expo-callkit-telecom` and `androidx.core-telecom` (works in foreground, background, and when app is completely killed).
- 🔔 **VoIP Push Triggers:** Sent via Firebase Cloud Messaging (FCM) high-priority data messages.
- 🎙️ **Peer-to-Peer Audio:** Direct live voice streaming via `@livekit/react-native-webrtc` using Google public STUN servers.
- 🎨 **Centralized Design:** All design tokens (colors, fonts, sizes) configured in a single `theme.ts` file.

---

## 📁 Repository Structure

```
├── expo-calling-app/          # Expo Android Mobile Client
│   ├── app.config.ts          # Expo configuration with native plugins
│   ├── App.tsx                # App root with navigation & font loader
│   ├── google-services.json   # (Ignored) Firebase Android config
│   ├── plugins/               # Native Android plugins & BroadcastReceivers
│   └── src/
│       ├── theme.ts           # Centralized design system (single source of truth)
│       ├── components/        # UserCard, AudioControls, CallTimer, PulseAnimation, StatusBadge
│       ├── hooks/             # useCallSession, usePushToken, useWebRTC
│       ├── screens/           # HomeScreen, InCallScreen, CallHistoryScreen
│       └── services/          # callManager, api, socket
└── server/                    # Node.js Express & Socket.IO Backend
    ├── service-account.json   # (Ignored) Firebase Admin Service Account Key
    ├── .env                   # Server environment variables
    └── src/
        ├── index.ts           # Server entry point
        ├── routes/calls.ts    # REST API for call lifecycle & tokens
        ├── services/fcm.ts    # FCM VoIP Push Dispatcher
        ├── signaling.ts       # Socket.IO WebRTC Signaling
        └── scripts/           # Standalone CLI test call tool
```

---

## ⚙️ Prerequisites

1. **Android Phone:** Physical Android device (API 26+ / Android 8.0+) with USB Debugging enabled.
2. **Node.js:** v20+ installed on your development machine.
3. **Firebase Project:**
   - Place `google-services.json` in `expo-calling-app/`
   - Place `service-account.json` in `server/`

---

## 🚀 How to Run the Project

### 1. Start the Backend Server

Open Terminal:

```bash
cd "server"
npm install
npm run dev
```

*Server starts on `http://0.0.0.0:3001` with WebRTC signaling and FCM dispatch.*

---

### 2. Build & Launch on Android Phone

Connect your Android phone via USB, then open a second Terminal:

```bash
cd "expo-calling-app"
npm install
npx expo run:android
```

*(This compiles the native Android dev build with Telecom integration and installs it directly on your phone).*

---

### 3. Test Call Scenarios

Once the app opens on your phone, you can trigger incoming call tests anytime from your terminal:

```bash
cd "server"
npm run test-call user_a
```

#### Test Cases Supported:
- **Foreground:** Rings with native banner/screen → Tap Answer → Live HD audio.
- **Background:** Minimize app → Trigger push → Native call screen rings.
- **Killed / Closed:** Force close app → Trigger push → Full-screen Telecom screen wakes device.
- **Decline:** Tap Decline → Call cancels on caller's side immediately.
- **Timeout:** Let ring for 45s without answering → Server automatically marks as missed call.
- **Audio Routing:** Toggle between Speaker and Earpiece during an active call.
