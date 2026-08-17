import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

export interface CallLogItem {
  id: string;
  name: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: Date;
  durationSeconds?: number;
}

interface CallHistoryScreenProps {
  logs: CallLogItem[];
  onBack: () => void;
  onCallUser: (userId: string, name: string) => void;
}

export function CallHistoryScreen({ logs, onBack, onCallUser }: CallHistoryScreenProps) {
  const renderItem = ({ item }: { item: CallLogItem }) => {
    const isMissed = item.direction === 'missed';
    const isOutgoing = item.direction === 'outgoing';

    const getDirectionIcon = () => {
      if (isMissed) return '↙️';
      if (isOutgoing) return '↗️';
      return '↙️';
    };

    const formatTime = (d: Date) => {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (sec?: number) => {
      if (!sec) return isMissed ? 'Missed Call' : 'Unanswered';
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}m ${s}s`;
    };

    return (
      <View style={styles.logCard}>
        <View style={styles.logInfo}>
          <Text style={styles.logName}>{item.name}</Text>
          <View style={styles.logMetaRow}>
            <Text style={styles.directionIcon}>{getDirectionIcon()}</Text>
            <Text style={[styles.logDuration, isMissed && styles.missedText]}>
              {formatDuration(item.durationSeconds)} • {formatTime(item.timestamp)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.callBackBtn}
          onPress={() => onCallUser(item.id, item.name)}
        >
          <Text style={styles.callBackIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.bgGradientStart, theme.colors.bgGradientMid, theme.colors.bgDark]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Call History</Text>
        <View style={{ width: 40 }} />
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📞</Text>
          <Text style={styles.emptyTitle}>No Calls Yet</Text>
          <Text style={styles.emptyDesc}>
            Incoming and outgoing calls will be logged here with timestamps and duration.
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id + item.timestamp.toISOString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: theme.colors.textPrimary,
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xl,
    color: theme.colors.textPrimary,
  },
  listContent: {
    padding: theme.layout.screenPaddingH,
    paddingTop: theme.spacing.md,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logInfo: {
    flex: 1,
  },
  logName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  logDuration: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  missedText: {
    color: theme.colors.error,
  },
  callBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.bgSurface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  callBackIcon: {
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xl,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  emptyDesc: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
