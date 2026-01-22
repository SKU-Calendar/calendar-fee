import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logout } from '@/api/auth';
import { getTimerStats } from '@/api/timer';
import { getGroups } from '@/api/group';
import { getNotifications, markNotificationRead, type Notification } from '@/api/notifications';
import { getUser } from '@/utils/storage';
import { THEME } from '@/utils/colors';

const SettingsScreen: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const storedUser = await getUser();
      setUser(storedUser);

      // 공부 시간 통계 조회
      const statsResponse = await getTimerStats();
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      // 그룹 목록 조회
      const groupsResponse = await getGroups();
      if (groupsResponse.success && groupsResponse.data) {
        setGroups(groupsResponse.data);
      }
    } catch (error) {
      console.error('프로필 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  const handleOpenNotifications = async () => {
    setNotificationsModalVisible(true);
    const res = await getNotifications();
    if (res.success && res.data) setNotifications(res.data);
  };

  const handleNotificationPress = async (n: Notification) => {
    if (n.read) return;
    const res = await markNotificationRead(n.id);
    if (res.success) {
      setNotifications(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)));
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // RootNavigator에서 isLoggedIn 상태가 변경되면 자동으로 Auth 화면으로 이동합니다
              // navigation.reset은 필요하지 않습니다
            } catch (error: any) {
              Alert.alert('오류', error.message || '로그아웃 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* 프로필 정보 */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.[0] || user?.email?.[0] || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || user?.email || '사용자'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* 공부 시간 통계 — API 실패 시에도 섹션 표시, 없으면 0분 */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>공부 시간</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatTime(stats?.totalTime ?? 0)}</Text>
              <Text style={styles.statLabel}>총 공부 시간</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatTime(stats?.todayTime ?? 0)}</Text>
              <Text style={styles.statLabel}>오늘</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatTime(stats?.weeklyTime ?? 0)}</Text>
              <Text style={styles.statLabel}>이번 주</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatTime(stats?.monthlyTime ?? 0)}</Text>
              <Text style={styles.statLabel}>이번 달</Text>
            </View>
          </View>
        </View>

        {/* 그룹 정보 */}
        {groups.length > 0 && (
          <View style={styles.groupsSection}>
            <Text style={styles.sectionTitle}>참여 중인 그룹</Text>
            {groups.map((group) => (
              <View key={group.id} style={styles.groupCard}>
                <Text style={styles.groupName}>{group.name}</Text>
                {group.description && (
                  <Text style={styles.groupDescription}>{group.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 알림 (GET /api/notifications) */}
        <TouchableOpacity style={styles.notificationsRow} onPress={handleOpenNotifications}>
          <Text style={styles.notificationsTitle}>알림</Text>
          <Text style={styles.notificationsSub}>탭하여 목록 보기</Text>
        </TouchableOpacity>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 알림 모달 */}
      <Modal
        visible={notificationsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>알림</Text>
            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>알림이 없습니다.</Text>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.notificationCard, item.read && styles.notificationCardRead]}
                    onPress={() => handleNotificationPress(item)}
                  >
                    <Text style={[styles.notificationTitle, item.read && styles.notificationTitleRead]}>
                      {item.title}
                    </Text>
                    {item.body && <Text style={styles.notificationBody}>{item.body}</Text>}
                    <Text style={styles.notificationDate}>
                      {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => setNotificationsModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: THEME.backgroundWhite,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: THEME.backgroundWhite,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  groupsSection: {
    padding: 20,
  },
  notificationsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: THEME.backgroundWhite,
    borderRadius: 12,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  notificationsSub: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: THEME.backgroundWhite,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 16,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmButton: {
    backgroundColor: THEME.primary,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationCard: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  notificationCardRead: {
    backgroundColor: THEME.background,
    opacity: 0.8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  notificationTitleRead: {
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  notificationBody: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  notificationDate: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 6,
  },
  emptyText: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  groupCard: {
    backgroundColor: THEME.backgroundWhite,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  logoutButton: {
    backgroundColor: THEME.error,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    margin: 20,
    shadowColor: THEME.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default SettingsScreen;

