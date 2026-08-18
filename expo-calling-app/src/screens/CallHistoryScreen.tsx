import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
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
  onClearLogs?: () => void;
}

export function CallHistoryScreen({ logs, onBack, onCallUser, onClearLogs }: CallHistoryScreenProps) {
  const [showClearModal, setShowClearModal] = useState(false);

  const confirmClear = () => {
    setShowClearModal(false);
    if (onClearLogs) {
      onClearLogs();
    }
  };

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
          activeOpacity={0.7}
        >
          <Text style={styles.callBackIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Professional Cool Light Background Gradient */}
      <LinearGradient
        colors={['#F8FAFC', '#EEF2F6', '#E2E8F0']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Call History</Text>

        {logs.length > 0 && onClearLogs ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setShowClearModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIcon}>🕒</Text>
          </View>
          <Text style={styles.emptyTitle}>No Call Logs</Text>
          <Text style={styles.emptyDesc}>
            Your incoming, outgoing, and missed calls will appear here automatically.
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id + item.timestamp.toISOString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Standard Cool-Light Clear Confirmation Modal */}
      <Modal visible={showClearModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Text style={styles.modalTrashIcon}>🗑️</Text>
            </View>

            <Text style={styles.modalTitle}>Clear Call History</Text>
            <Text style={styles.modalDesc}>
              Are you sure you want to delete all call history logs? This action cannot be undone.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowClearModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDelete]}
                onPress={confirmClear}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnDeleteText}>Delete All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  backIcon: {
    fontSize: 22,
    color: '#0F172A',
    fontWeight: 'bold',
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xl,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  clearButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSize.xs + 1,
    color: '#DC2626',
  },
  listContent: {
    padding: theme.layout.screenPaddingH,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  logInfo: {
    flex: 1,
  },
  logName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSize.md,
    color: '#0F172A',
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
    color: '#64748B',
  },
  missedText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  callBackBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
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
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xl,
    color: '#0F172A',
    marginBottom: theme.spacing.xs,
  },
  emptyDesc: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  modalTrashIcon: {
    fontSize: 24,
  },
  modalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xl,
    color: '#0F172A',
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  modalDesc: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: '#64748B',
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm + 4,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBtnCancelText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.sm + 1,
    color: '#475569',
  },
  modalBtnDelete: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modalBtnDeleteText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.sm + 1,
    color: '#FFFFFF',
  },
});
