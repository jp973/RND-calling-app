import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { UserCard } from '../components/UserCard';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { SERVER_URL } from '../utils/constants';

interface HomeScreenProps {
  currentUserId: string;
  onChangeUser: (userId: string) => void;
  onStartCall: (targetUserId: string, targetName: string) => void;
  onOpenHistory: () => void;
  isPushRegistered: boolean;
  pushToken: string | null;
}

interface ContactUser {
  id: string;
  name: string;
  online: boolean;
}

const DEFAULT_USERS: ContactUser[] = [
  { id: 'user_a', name: 'Alice (User A)', online: true },
  { id: 'user_b', name: 'Bob (User B)', online: true },
  { id: 'user_c', name: 'Charlie (User C)', online: false },
];

export function HomeScreen({
  currentUserId,
  onChangeUser,
  onStartCall,
  onOpenHistory,
  isPushRegistered,
  pushToken,
}: HomeScreenProps) {
  const [users, setUsers] = useState<ContactUser[]>(DEFAULT_USERS);
  const [serverUrl, setServerUrl] = useState(SERVER_URL);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempUrl, setTempUrl] = useState(SERVER_URL);
  const [loadingCall, setLoadingCall] = useState<string | null>(null);

  // Poll or query user list if server is active
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.getUsers();
        if (res && res.users) {
          const mapped = res.users.map((u) => ({
            id: u.userId,
            name: u.userId === 'user_a' ? 'Alice (User A)' : u.userId === 'user_b' ? 'Bob (User B)' : u.userId,
            online: u.online,
          }));
          // Merge with defaults
          setUsers((prev) => {
            const map = new Map(prev.map((item) => [item.id, item]));
            mapped.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
            return Array.from(map.values());
          });
        }
      } catch {
        // Fall back to default user list in offline/demo mode
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInitiateCall = async (targetId: string, targetName: string) => {
    setLoadingCall(targetId);
    try {
      await onStartCall(targetId, targetName);
    } catch (err: any) {
      Alert.alert('Call Failed', err?.message || 'Could not initiate call');
    } finally {
      setLoadingCall(null);
    }
  };

  const saveServerUrl = () => {
    setServerUrl(tempUrl);
    api.setBaseUrl(tempUrl);
    socketService.setServerUrl(tempUrl);
    socketService.connect(currentUserId);
    setShowConfigModal(false);
    Alert.alert('Server Updated', `New endpoint: ${tempUrl}`);
  };

  const otherUsers = users.filter((u) => u.id !== currentUserId);
  const currentUserObj = users.find((u) => u.id === currentUserId) || {
    id: currentUserId,
    name: currentUserId === 'user_a' ? 'Alice' : currentUserId === 'user_b' ? 'Bob' : currentUserId,
    online: true,
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.bgGradientStart, theme.colors.bgGradientMid, theme.colors.bgGradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>ExpoCall Android</Text>
          <Text style={styles.subtitle}>Telecom & WebRTC Engine</Text>
        </View>
        <TouchableOpacity
          style={styles.configButton}
          onPress={() => {
            setTempUrl(serverUrl);
            setShowConfigModal(true);
          }}
        >
          <Text style={styles.configIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.identityHeader}>
            <Text style={styles.sectionLabel}>YOUR IDENTITY</Text>
            <StatusBadge status={isPushRegistered ? 'online' : 'offline'} />
          </View>

          <View style={styles.identityRow}>
            <View style={styles.myAvatar}>
              <Text style={styles.myAvatarText}>
                {currentUserObj.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.identityDetails}>
              <Text style={styles.myDisplayName}>{currentUserObj.name}</Text>
              <Text style={styles.myUserId}>ID: {currentUserId}</Text>
              <Text style={styles.tokenStatus} numberOfLines={1}>
                {isPushRegistered ? '🟢 FCM Push Token Active' : '🟡 Registering FCM...'}
              </Text>
            </View>
          </View>

          {/* Quick Switch Buttons */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Switch device persona:</Text>
            <View style={styles.personaButtons}>
              <TouchableOpacity
                style={[styles.personaBtn, currentUserId === 'user_a' && styles.personaBtnActive]}
                onPress={() => onChangeUser('user_a')}
              >
                <Text style={[styles.personaBtnText, currentUserId === 'user_a' && styles.personaBtnTextActive]}>
                  Alice (A)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.personaBtn, currentUserId === 'user_b' && styles.personaBtnActive]}
                onPress={() => onChangeUser('user_b')}
              >
                <Text style={[styles.personaBtnText, currentUserId === 'user_b' && styles.personaBtnTextActive]}>
                  Bob (B)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Contacts Section */}
        <View style={styles.contactsSection}>
          <View style={styles.contactsHeaderRow}>
            <Text style={styles.sectionLabel}>DIRECT CALL TARGETS</Text>
            <TouchableOpacity onPress={onOpenHistory}>
              <Text style={styles.historyLinkText}>🕒 Call Log</Text>
            </TouchableOpacity>
          </View>

          {otherUsers.map((contact) => (
            <UserCard
              key={contact.id}
              userId={contact.id}
              displayName={contact.name}
              online={contact.online}
              disabled={loadingCall === contact.id}
              onCall={() => handleInitiateCall(contact.id, contact.name)}
            />
          ))}
        </View>

        {/* Server & Push Diagnostics */}
        <View style={styles.diagnosticsCard}>
          <Text style={styles.diagnosticsTitle}>Connection & Diagnostics</Text>
          <View style={styles.diagnosticRow}>
            <Text style={styles.diagLabel}>Server Endpoint:</Text>
            <Text style={styles.diagValue} numberOfLines={1}>{serverUrl}</Text>
          </View>
          <View style={styles.diagnosticRow}>
            <Text style={styles.diagLabel}>VoIP Channel:</Text>
            <Text style={styles.diagValue}>Jetpack Core-Telecom</Text>
          </View>
          <View style={styles.diagnosticRow}>
            <Text style={styles.diagLabel}>FCM Token:</Text>
            <Text style={styles.diagValue} numberOfLines={1}>
              {pushToken ? `${pushToken.substring(0, 16)}...` : 'Not available'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Server Config Modal */}
      <Modal visible={showConfigModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configure Node Server</Text>
            <Text style={styles.modalDesc}>
              Enter your local Mac IP or ngrok HTTPS address so your real Android phone can reach the backend.
            </Text>

            <TextInput
              style={styles.textInput}
              value={tempUrl}
              onChangeText={setTempUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.1.50:3001 or https://xxx.ngrok.io"
              placeholderTextColor={theme.colors.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowConfigModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={saveServerUrl}
              >
                <Text style={styles.modalBtnSaveText}>Save Endpoint</Text>
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
    backgroundColor: theme.colors.bgDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  appTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xxl,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primaryLight,
    marginTop: 2,
  },
  configButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  configIcon: {
    fontSize: 20,
  },
  scrollContent: {
    padding: theme.layout.screenPaddingH,
    paddingBottom: theme.spacing.xxxl,
  },
  identityCard: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  identityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  myAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primaryLight,
  },
  myAvatarText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  identityDetails: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  myDisplayName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  myUserId: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tokenStatus: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  switchRow: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  switchLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  personaButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  personaBtn: {
    flex: 1,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.bgSurface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  personaBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  personaBtnText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  personaBtnTextActive: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.bold,
  },
  contactsSection: {
    marginBottom: theme.spacing.lg,
  },
  contactsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  historyLinkText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primaryLight,
  },
  diagnosticsCard: {
    backgroundColor: theme.colors.bgSurface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  diagnosticsTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  diagnosticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  diagLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  diagValue: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    maxWidth: '65%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.bgOverlay,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  modalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xl,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  modalDesc: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: theme.colors.bgSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: theme.colors.bgSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalBtnCancelText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  modalBtnSave: {
    backgroundColor: theme.colors.primary,
  },
  modalBtnSaveText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
});
