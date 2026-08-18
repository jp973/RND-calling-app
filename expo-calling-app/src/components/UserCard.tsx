/**
 * UserCard — Displays a user with their online status and a call button
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { theme } from '../theme';

interface UserCardProps {
  userId: string;
  displayName: string;
  online: boolean;
  onCall: () => void;
  disabled?: boolean;
}

export function UserCard({
  userId,
  displayName,
  online,
  onCall,
  disabled = false,
}: UserCardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  // Generate avatar initials
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.card}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          {/* Online indicator */}
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: online
                  ? theme.colors.online
                  : '#94A3B8',
              },
            ]}
          />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.status}>
            {online ? '● Online' : '○ Offline'}
          </Text>
        </View>

        {/* Call Button */}
        <TouchableOpacity
          style={[
            styles.callButton,
            !online || disabled ? styles.callButtonDisabled : null,
          ]}
          onPress={onCall}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!online || disabled}
          activeOpacity={0.8}
        >
          <Text style={styles.callButtonIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: theme.layout.avatarSizeMedium,
    height: theme.layout.avatarSizeMedium,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  initials: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.lg,
    color: '#4F46E5',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  info: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  name: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSize.lg,
    color: '#0F172A',
  },
  status: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: '#64748B',
    marginTop: theme.spacing.xxs,
  },
  callButton: {
    width: theme.layout.avatarSizeSmall + 8,
    height: theme.layout.avatarSizeSmall + 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  callButtonDisabled: {
    backgroundColor: '#CBD5E1',
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  callButtonIcon: {
    fontSize: 22,
  },
});
