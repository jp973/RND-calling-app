import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { ActiveCall } from '../services/callManager';
import { PulseAnimation } from '../components/PulseAnimation';
import { CallTimer } from '../components/CallTimer';
import { AudioControls } from '../components/AudioControls';
import { useWebRTC } from '../hooks/useWebRTC';

interface InCallScreenProps {
  activeCall: ActiveCall;
  onAnswer?: () => void;
  onHangup: () => void;
  onToggleMute: (muted: boolean) => void;
  onToggleSpeaker: (speaker: boolean) => void;
}

export function InCallScreen({
  activeCall,
  onAnswer,
  onHangup,
  onToggleMute,
  onToggleSpeaker,
}: InCallScreenProps) {
  const isCaller = activeCall.direction === 'outgoing';
  const isRinging =
    activeCall.state === 'ringing_incoming' ||
    activeCall.state === 'ringing_outgoing';
  const isIncomingRinging = activeCall.state === 'ringing_incoming';
  const isConnected = activeCall.state === 'connected';

  // Wire up peer-to-peer WebRTC audio when call is connecting or connected
  const { connectionState } = useWebRTC({
    roomId: activeCall.serverCallId,
    isCaller,
    enabled: activeCall.state === 'connecting' || activeCall.state === 'connected',
  });

  const getStatusLabel = () => {
    switch (activeCall.state) {
      case 'ringing_outgoing':
        return 'Calling...';
      case 'ringing_incoming':
        return 'Incoming Call...';
      case 'connecting':
        return 'Connecting Audio...';
      case 'connected':
        return connectionState === 'connected' ? 'Connected (HD Audio)' : 'Connected';
      case 'ended':
        return 'Call Ended';
      default:
        return '';
    }
  };

  const initials = (activeCall.remoteName || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.bgGradientStart, theme.colors.bgGradientMid, theme.colors.bgDark]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={styles.encryptionBadge}>🔒 End-to-End Encrypted WebRTC</Text>
      </View>

      {/* Central Content */}
      <View style={styles.centerContent}>
        {/* Pulse rings during ringing */}
        <PulseAnimation
          active={isRinging}
          size={theme.layout.avatarSizeHero}
          color={isIncomingRinging ? theme.colors.answerGreenGlow : theme.colors.primaryGlow}
        />

        {/* Large Avatar */}
        <View style={styles.avatarWrapper}>
          <View
            style={[
              styles.avatar,
              isIncomingRinging && { borderColor: theme.colors.answerGreen },
            ]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        {/* Remote Party Name */}
        <Text style={styles.callerName}>{activeCall.remoteName}</Text>
        <Text style={styles.statusLabel}>{getStatusLabel()}</Text>

        {/* Live Call Duration */}
        <View style={styles.timerContainer}>
          {isConnected ? (
            <CallTimer startTime={activeCall.connectedAt || new Date()} running={true} />
          ) : (
            <Text style={styles.directionLabel}>
              {activeCall.direction === 'outgoing' ? 'Outgoing Call' : 'Incoming Call'}
            </Text>
          )}
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {isIncomingRinging ? (
          /* Incoming Call Ringing: Big Green Answer + Red Decline buttons */
          <View style={styles.incomingActionRow}>
            {/* Decline Button */}
            <TouchableOpacity
              style={styles.declineButton}
              onPress={onHangup}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>📵</Text>
              <Text style={styles.actionLabel}>Decline</Text>
            </TouchableOpacity>

            {/* Answer Button */}
            <TouchableOpacity
              style={styles.answerButton}
              onPress={onAnswer}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>📞</Text>
              <Text style={styles.actionLabel}>Answer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Connected or Outgoing: Mute, Speaker, Hangup controls */
          <AudioControls
            onMuteToggle={onToggleMute}
            onSpeakerToggle={onToggleSpeaker}
            onHangup={onHangup}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgDark,
    justifyContent: 'space-between',
  },
  topHeader: {
    paddingTop: theme.spacing.xxxl,
    alignItems: 'center',
  },
  encryptionBadge: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: theme.layout.avatarSizeHero,
    height: theme.layout.avatarSizeHero,
    borderRadius: theme.layout.avatarSizeHero / 2,
    backgroundColor: theme.colors.bgSurface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.primary,
    ...theme.shadows.glow,
  },
  avatarText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.hero,
    color: theme.colors.primaryLight,
  },
  callerName: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xxl,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  statusLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.md,
    color: theme.colors.primaryLight,
    marginBottom: theme.spacing.md,
  },
  timerContainer: {
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  bottomControls: {
    paddingBottom: theme.spacing.xl,
  },
  incomingActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  answerButton: {
    width: theme.layout.actionButtonSizeLarge,
    height: theme.layout.actionButtonSizeLarge,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.answerGreen,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.buttonGreen,
  },
  declineButton: {
    width: theme.layout.actionButtonSizeLarge,
    height: theme.layout.actionButtonSizeLarge,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.declineRed,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.buttonRed,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionLabel: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSize.xs,
    color: theme.colors.white,
    marginTop: 2,
  },
});
