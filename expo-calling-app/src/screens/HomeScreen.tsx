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
  onSyncToken?: () => void;
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
  onSyncToken,
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
    if (onSyncToken) {
      onSyncToken();
    }
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
      {/* Professional Cool Light Background Gradient */}
      <LinearGradient
        colors={['#F8FAFC', '#EEF2F6', '#E2E8F0']}
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
          activeOpacity={0.7}
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
                activeOpacity={0.8}
              >
                <Text style={[styles.personaBtnText, currentUserId === 'user_a' && styles.personaBtnTextActive]}>
                  Alice (A)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.personaBtn, currentUserId === 'user_b' && styles.personaBtnActive]}
                onPress={() => onChangeUser('user_b')}
                activeOpacity={0.8}
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
            <TouchableOpacity onPress={onOpenHistory} activeOpacity={0.7}>
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
      <Modal visible={showConfigModal} transparent animationType="fade">
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
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowConfigModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={saveServerUrl}
                activeOpacity={0.8}
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.layout.screenPaddingH,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  appTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xxl,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.sm,
    color: '#4F46E5',
    marginTop: 2,
  },
  configButton: {
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
  configIcon: {
    fontSize: 20,
  },
  scrollContent: {
    padding: theme.layout.screenPaddingH,
    paddingBottom: theme.spacing.xxxl,
  },
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: theme.spacing.lg,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
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
    color: '#64748B',
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
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  myAvatarText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.lg,
    color: '#4F46E5',
  },
  identityDetails: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  myDisplayName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSize.lg,
    color: '#0F172A',
  },
  myUserId: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: '#64748B',
    marginTop: 2,
  },
  tokenStatus: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.xs,
    color: '#475569',
    marginTop: 4,
  },
  switchRow: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  switchLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.xs,
    color: '#64748B',
    marginBottom: theme.spacing.xs,
  },
  personaButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  personaBtn: {
    flex: 1,
    paddingVertical: theme.spacing.xs + 4,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  personaBtnActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4338CA',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  personaBtnText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.sm,
    color: '#475569',
  },
  personaBtnTextActive: {
    color: '#FFFFFF',
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
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSize.sm,
    color: '#4F46E5',
  },
  diagnosticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  diagnosticsTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.fontSize.sm,
    color: '#0F172A',
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
    color: '#64748B',
  },
  diagValue: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.xs,
    color: '#1E293B',
    maxWidth: '65%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.xl,
    color: '#0F172A',
    marginBottom: theme.spacing.xs,
  },
  modalDesc: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSize.sm,
    color: '#475569',
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
    color: '#0F172A',
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBtnCancelText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSize.md,
    color: '#475569',
  },
  modalBtnSave: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modalBtnSaveText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSize.md,
    color: '#FFFFFF',
  },
});
