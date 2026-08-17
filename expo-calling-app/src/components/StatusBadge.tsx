/**
 * StatusBadge — Online / Offline / In Call / Ringing badge
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

type BadgeStatus = 'online' | 'offline' | 'inCall' | 'ringing';

interface StatusBadgeProps {
  status: BadgeStatus;
}

const statusConfig: Record<
  BadgeStatus,
  { label: string; color: string; glow: string }
> = {
  online: {
    label: 'Online',
    color: theme.colors.online,
    glow: theme.colors.onlineGlow,
  },
  offline: {
    label: 'Offline',
    color: theme.colors.offline,
    glow: 'transparent',
  },
  inCall: {
    label: 'In Call',
    color: theme.colors.inCall,
    glow: theme.colors.inCallGlow,
  },
  ringing: {
    label: 'Ringing',
    color: theme.colors.ringing,
    glow: theme.colors.ringingGlow,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.glow }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs + 2,
  },
  label: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
