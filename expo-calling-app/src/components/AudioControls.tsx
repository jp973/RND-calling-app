/**
 * AudioControls — Mute, Speaker, Bluetooth controls during a call
 */
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface AudioControlsProps {
  onMuteToggle: (muted: boolean) => void;
  onSpeakerToggle: (speaker: boolean) => void;
  onHangup: () => void;
}

export function AudioControls({
  onMuteToggle,
  onSpeakerToggle,
  onHangup,
}: AudioControlsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  const handleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    onMuteToggle(next);
  };

  const handleSpeaker = () => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    onSpeakerToggle(next);
  };

  return (
    <View style={styles.container}>
      {/* Mute Button */}
      <TouchableOpacity
        style={[styles.controlButton, isMuted && styles.controlButtonActive]}
        onPress={handleMute}
        activeOpacity={0.7}
      >
        <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
        <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
          {isMuted ? 'Unmute' : 'Mute'}
        </Text>
      </TouchableOpacity>

      {/* Hangup Button */}
      <TouchableOpacity
        style={styles.hangupButton}
        onPress={onHangup}
        activeOpacity={0.8}
      >
        <Text style={styles.hangupIcon}>📵</Text>
      </TouchableOpacity>

      {/* Speaker Button */}
      <TouchableOpacity
        style={[styles.controlButton, isSpeaker && styles.controlButtonActive]}
        onPress={handleSpeaker}
        activeOpacity={0.7}
      >
        <Text style={styles.controlIcon}>{isSpeaker ? '🔊' : '🔈'}</Text>
        <Text style={[styles.controlLabel, isSpeaker && styles.controlLabelActive]}>
          {isSpeaker ? 'Earpiece' : 'Speaker'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  controlButton: {
    width: theme.layout.actionButtonSize,
    height: theme.layout.actionButtonSize,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  controlButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  controlIcon: {
    fontSize: 24,
  },
  controlLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xxs,
  },
  controlLabelActive: {
    color: theme.colors.textPrimary,
  },
  hangupButton: {
    width: theme.layout.actionButtonSizeLarge,
    height: theme.layout.actionButtonSizeLarge,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.declineRed,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.buttonRed,
  },
  hangupIcon: {
    fontSize: 32,
  },
});
