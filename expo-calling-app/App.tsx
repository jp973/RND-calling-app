import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { theme } from './src/theme';
import { HomeScreen } from './src/screens/HomeScreen';
import { InCallScreen } from './src/screens/InCallScreen';
import { CallHistoryScreen, CallLogItem } from './src/screens/CallHistoryScreen';
import { callManager, ActiveCall } from './src/services/callManager';
import { socketService } from './src/services/socket';
import { usePushToken } from './src/hooks/usePushToken';
import { useCallSession } from './src/hooks/useCallSession';

export default function App() {
  const [currentUserId, setCurrentUserId] = useState('user_a');
  const [currentScreen, setCurrentScreen] = useState<'home' | 'history'>('home');
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);

  // Load typography from Google Fonts
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Register VoIP Push and link token to current user ID
  const {
    token: pushToken,
    registered: isPushRegistered,
    sendTokenToServer,
  } = usePushToken(currentUserId);

  // Initialize CallManager listeners and socket connection
  useEffect(() => {
    callManager.setup();
    const socket = socketService.connect(currentUserId);

    return () => {
      // Cleanup on app teardown
    };
  }, [currentUserId]);

  // Hook into active call state
  const {
    activeCall,
    isInCall,
    answerCall,
    hangup,
    toggleMute,
    toggleSpeaker,
    startCall,
  } = useCallSession();

  // Record call history when an active call concludes
  useEffect(() => {
    if (activeCall?.state === 'ended') {
      const duration = activeCall.connectedAt
        ? Math.floor((new Date().getTime() - activeCall.connectedAt.getTime()) / 1000)
        : undefined;

      const logItem: CallLogItem = {
        id: activeCall.remoteId || 'unknown',
        name: activeCall.remoteName || 'Unknown User',
        direction: !activeCall.connectedAt && activeCall.direction === 'incoming'
          ? 'missed'
          : activeCall.direction,
        timestamp: activeCall.startedAt || new Date(),
        durationSeconds: duration,
      };

      setCallLogs((prev) => [logItem, ...prev]);
    }
  }, [activeCall?.state]);

  const handleStartCall = async (targetUserId: string, targetName: string) => {
    await startCall(targetUserId, targetName, currentUserId);
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bgDark} />

      {/* If there is an active call in ringing/connecting/connected state, show InCallScreen */}
      {isInCall && activeCall ? (
        <InCallScreen
          activeCall={activeCall}
          onAnswer={answerCall}
          onHangup={hangup}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
        />
      ) : currentScreen === 'history' ? (
        <CallHistoryScreen
          logs={callLogs}
          onBack={() => setCurrentScreen('home')}
          onCallUser={(id, name) => {
            setCurrentScreen('home');
            handleStartCall(id, name);
          }}
        />
      ) : (
        <HomeScreen
          currentUserId={currentUserId}
          onChangeUser={(newId) => {
            setCurrentUserId(newId);
            socketService.disconnect();
            socketService.connect(newId);
            sendTokenToServer(newId);
          }}
          onSyncToken={() => sendTokenToServer(currentUserId)}
          onStartCall={handleStartCall}
          onOpenHistory={() => setCurrentScreen('history')}
          isPushRegistered={isPushRegistered}
          pushToken={pushToken}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bgDark,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
