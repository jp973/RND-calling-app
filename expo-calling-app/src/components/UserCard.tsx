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
                  : theme.colors.offline,
              },
            ]}
          />
          {online && <View style={styles.statusGlow} />}
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
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: theme.layout.avatarSizeMedium,
    height: theme.layout.avatarSizeMedium,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.bgSurface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  initials: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.colors.bgCard,
  },
  statusGlow: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.onlineGlow,
  },
  info: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  name: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  status: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xxs,
  },
  callButton: {
    width: theme.layout.avatarSizeSmall + 8,
    height: theme.layout.avatarSizeSmall + 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.answerGreen,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.buttonGreen,
  },
  callButtonDisabled: {
    backgroundColor: theme.colors.offline,
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  callButtonIcon: {
    fontSize: 22,
  },
});
