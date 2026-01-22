import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGroups, createGroup, inviteGroup, getGroupMembers, joinGroupByCode, joinPublicGroup, getGroupInvitations, acceptInvitation, rejectInvitation, leaveGroup, type Group, type GroupMember, type GroupInvitation } from '@/api/group';
import { getFriendStats } from '@/api/social';
import { getUser } from '@/utils/storage';
import { THEME } from '@/utils/colors';

const GroupScreen: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isPublic, setIsPublic] = useState(true); // 공개 여부
  const [invitationsModalVisible, setInvitationsModalVisible] = useState(false);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [selectedGroupForInvitations, setSelectedGroupForInvitations] = useState<Group | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const [groupsRes, u] = await Promise.all([getGroups(), getUser()]);
      setCurrentUserId(u?.id ?? null);
      if (groupsRes.success && groupsRes.data) {
        // 서버 목록 + 서버에 없지만 로컬에 있는 그룹(방금 생성 등) 유지
        setGroups((prev) => {
          const fromApi = groupsRes.data || [];
          const apiIds = new Set(fromApi.map((g) => g.id));
          const localOnly = (prev || []).filter((g) => !apiIds.has(g.id));
          return [...fromApi, ...localOnly];
        });
      }
    } catch (error) {
      console.error('그룹 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('알림', '그룹 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await createGroup({
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        isPublic: isPublic,
      });
      if (response.success && response.data) {
        // 즉시 목록에 반영 (백엔드 반영 전에도 보이도록)
        setGroups((prev) => [
          ...(prev || []),
          { ...response.data!, memberCount: response.data!.memberCount ?? 0 },
        ]);
        setCreateModalVisible(false);
        setGroupName('');
        setGroupDescription('');
        setIsPublic(true);
        await loadGroups();
        const visibilityText = isPublic ? '공개' : '비공개';
        if (isPublic) {
          Alert.alert('그룹 생성 완료', `${visibilityText} 그룹이 생성되었습니다.`, [{ text: '확인' }]);
        } else {
          const invRes = await inviteGroup(response.data.id);
          const code = invRes.data?.code || response.data?.code || '';
          let body = `${visibilityText} 그룹이 생성되었습니다.\n\n초대 코드: ${code || '(발급 실패)'}\n\n이 코드를 공유하여 친구들을 초대하세요!`;
          if (!code) {
            body += '\n\n※ 그룹 카드의 "초대" 버튼을 눌러 코드를 발급받을 수 있습니다.';
            if (!invRes.success && invRes.error) body += `\n(오류: ${invRes.error})`;
          }
          Alert.alert('그룹 생성 완료', body, [{ text: '확인' }]);
        }
      } else {
        Alert.alert('오류', response.error || '그룹 생성에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '그룹 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length !== 8) {
      Alert.alert('알림', '8자리 초대 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await joinGroupByCode(code);
      if (response.success && response.data) {
        setJoinModalVisible(false);
        setJoinCode('');
        await loadGroups();
        
        if (response.requiresApproval) {
          // 비공개 그룹: 방장 승인 대기
          Alert.alert(
            '참여 요청 완료',
            `"${response.data.name}" 그룹에 참여 요청을 보냈습니다.\n방장의 승인을 기다려주세요.`,
            [{ text: '확인' }]
          );
        } else {
          // 공개 그룹: 바로 참여
          Alert.alert('완료', `"${response.data.name}" 그룹에 참여했습니다!`);
        }
      } else {
        Alert.alert('오류', response.error || '그룹 참여에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '그룹 참여 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPublicGroup = async (group: Group) => {
    setLoading(true);
    try {
      const response = await joinPublicGroup(group.id);
      if (response.success) {
        await loadGroups();
        Alert.alert('완료', `"${group.name}" 그룹에 참여했습니다!`);
      } else {
        Alert.alert('오류', response.error || '그룹 참여에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '그룹 참여 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvitations = async (group: Group) => {
    setSelectedGroupForInvitations(group);
    setLoading(true);
    try {
      const response = await getGroupInvitations(group.id);
      if (response.success && response.data) {
        // pending 상태인 요청만 필터링
        const pendingInvitations = response.data.filter(inv => inv.status === 'pending');
        setInvitations(pendingInvitations);
        setInvitationsModalVisible(true);
      } else {
        Alert.alert('오류', response.error || '초대 요청 목록 조회에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '초대 요청 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitation: GroupInvitation) => {
    try {
      const response = await acceptInvitation(invitation.groupId, invitation.id);
      if (response.success) {
        // 목록에서 제거
        setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
        await loadGroups(); // 그룹 목록 새로고침
        Alert.alert('완료', `${invitation.userName || invitation.userEmail}님의 참여 요청을 수락했습니다.`);
      } else {
        Alert.alert('오류', response.error || '초대 수락에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '초대 수락 중 오류가 발생했습니다.');
    }
  };

  const handleRejectInvitation = async (invitation: GroupInvitation) => {
    Alert.alert(
      '참여 요청 거절',
      `${invitation.userName || invitation.userEmail}님의 참여 요청을 거절하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거절',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await rejectInvitation(invitation.groupId, invitation.id);
              if (response.success) {
                // 목록에서 제거
                setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
                Alert.alert('완료', '참여 요청을 거절했습니다.');
              } else {
                Alert.alert('오류', response.error || '초대 거절에 실패했습니다.');
              }
            } catch (error: any) {
              Alert.alert('오류', error.message || '초대 거절 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleInvite = async (groupId: string) => {
    try {
      const response = await inviteGroup(groupId);
      if (response.success && response.data) {
        Alert.alert('초대 코드', `초대 코드: ${response.data.code}`, [
          { text: '확인' },
        ]);
      } else {
        Alert.alert('오류', response.error || '초대 코드 발급에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '초대 코드 발급 중 오류가 발생했습니다.');
    }
  };

  const handleLeaveGroup = async (group: Group) => {
    if (group.ownerId === currentUserId) {
      Alert.alert('알림', '방장은 그룹을 나갈 수 없습니다. 그룹을 삭제해주세요.');
      return;
    }
    Alert.alert(
      '그룹 나가기',
      `"${group.name}" 그룹에서 나가시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await leaveGroup(group.id);
              if (res.success) {
                setMembersModalVisible(false);
                setSelectedGroup(null);
                await loadGroups();
                Alert.alert('완료', '그룹에서 나갔습니다.');
              } else {
                Alert.alert('오류', res.error || '나가기에 실패했습니다.');
              }
            } catch (e: any) {
              Alert.alert('오류', e.message || '나가기 중 오류가 발생했습니다.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewMembers = async (group: Group) => {
    setSelectedGroup(group);
    setLoading(true);
    try {
      const response = await getGroupMembers(group.id);
      if (response.success && response.data) {
        setMembers(response.data);
        setMembersModalVisible(true);
      } else {
        Alert.alert('오류', response.error || '멤버 목록 조회에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '멤버 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds?: number): string => {
    if (!seconds) return '0시간';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}시간 ${minutes > 0 ? `${minutes}분` : ''}`;
    }
    return `${minutes}분`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>그룹</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, styles.joinButton]}
            onPress={() => setJoinModalVisible(true)}
          >
            <Text style={styles.headerButtonText}>참여</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, styles.createButton]}
            onPress={() => setCreateModalVisible(true)}
          >
            <Text style={styles.headerButtonText}>+ 생성</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && groups.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>그룹이 없습니다.</Text>
          <Text style={styles.emptySubText}>그룹을 생성하여 공부 친구들을 초대해보세요!</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.groupCard}>
              <View style={styles.groupInfo}>
                <View style={styles.groupTitleRow}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <View
                    style={[
                      styles.groupBadge,
                      item.isPublic ? styles.badgePublic : styles.badgePrivate,
                    ]}
                  >
                    <Text style={styles.groupBadgeText}>
                      {item.isPublic ? '공개' : '비공개'}
                    </Text>
                  </View>
                </View>
                {item.description && (
                  <Text style={styles.groupDescription}>{item.description}</Text>
                )}
                {!item.isPublic && item.code && (
                  <View style={styles.codeContainer}>
                    <Text style={styles.codeLabel}>초대 코드:</Text>
                    <Text style={styles.codeText}>{item.code}</Text>
                  </View>
                )}
                <View style={styles.groupMetaRow}>
                  <Text style={styles.groupMeta}>멤버 {item.memberCount || 0}명</Text>
                  {item.isPublic && (
                    <Text style={styles.groupMetaHint}>코드 없이 바로 참여</Text>
                  )}
                </View>
              </View>
              <View style={styles.groupActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleViewMembers(item)}
                >
                  <Text style={styles.actionButtonText}>멤버</Text>
                </TouchableOpacity>
                {/* 방장인 경우에만 초대 요청 확인 버튼 표시 (비공개 그룹) */}
                {!item.isPublic && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.notificationButton]}
                    onPress={() => handleViewInvitations(item)}
                  >
                    <Text style={styles.actionButtonText}>알림</Text>
                  </TouchableOpacity>
                )}
                {!item.isPublic && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.inviteButton]}
                    onPress={() => {
                      if (item.code) {
                        Alert.alert(
                          '초대 코드',
                          `초대 코드: ${item.code}\n\n이 코드를 공유하여 친구들을 초대하세요!`,
                          [{ text: '확인' }]
                        );
                      } else {
                        handleInvite(item.id);
                      }
                    }}
                  >
                  <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                    초대
                  </Text>
                  </TouchableOpacity>
                )}
                {item.isPublic && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.inviteButton]}
                    onPress={() => handleJoinPublicGroup(item)}
                  >
                  <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                    참여
                  </Text>
                  </TouchableOpacity>
                )}
                {/* 방장이 아닐 때만 나가기 표시 (DELETE /api/group/{groupId}/me) */}
                {item.ownerId !== currentUserId && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.leaveButton]}
                    onPress={() => handleLeaveGroup(item)}
                  >
                    <Text style={[styles.actionButtonText, styles.leaveButtonText]}>나가기</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* 그룹 생성 모달 - 키보드 올라와도 스크롤로 생성 버튼 접근 가능 */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.modalTitle}>그룹 생성</Text>
              <TextInput
                style={styles.input}
                placeholder="그룹 이름"
                value={groupName}
                onChangeText={setGroupName}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="설명 (선택사항)"
                value={groupDescription}
                onChangeText={setGroupDescription}
                multiline
                numberOfLines={3}
              />
              <View style={styles.publicOptionContainer}>
                <Text style={styles.publicOptionLabel}>공개 여부</Text>
                <View style={styles.publicOptionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.publicOptionButton,
                      isPublic && styles.publicOptionButtonActive,
                    ]}
                    onPress={() => setIsPublic(true)}
                  >
                    <Text
                      style={[
                        styles.publicOptionButtonText,
                        isPublic && styles.publicOptionButtonTextActive,
                      ]}
                    >
                      공개
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.publicOptionButton,
                      !isPublic && styles.publicOptionButtonActive,
                    ]}
                    onPress={() => setIsPublic(false)}
                  >
                    <Text
                      style={[
                        styles.publicOptionButtonText,
                        !isPublic && styles.publicOptionButtonTextActive,
                      ]}
                    >
                      비공개
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.publicOptionHint}>
                  {isPublic
                    ? '공개: 코드 없이 바로 참여 가능'
                    : '비공개: 방장의 승인이 필요합니다'}
                </Text>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setCreateModalVisible(false);
                    setGroupName('');
                    setGroupDescription('');
                  }}
                >
                  <Text style={styles.modalButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleCreateGroup}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>생성</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 멤버 목록 모달 */}
      <Modal
        visible={membersModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMembersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedGroup?.name} 멤버
            </Text>
              <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.memberCard}
                  onPress={async () => {
                    // 친구 공부 통계 (GET /api/social/{userId}/stats)
                    try {
                      const res = await getFriendStats(item.userId);
                      if (res.success && res.data) {
                        Alert.alert(
                          `${item.name || item.email}의 공부 시간`,
                          `총: ${formatTime(res.data.totalTime ?? 0)}\n` +
                          `오늘: ${formatTime(res.data.todayTime ?? 0)}\n` +
                          `이번 주: ${formatTime(res.data.weeklyTime ?? 0)}\n` +
                          `이번 달: ${formatTime(res.data.monthlyTime ?? 0)}`,
                          [{ text: '확인' }]
                        );
                      } else {
                        Alert.alert('오류', res.error || '공부 시간 조회에 실패했습니다.');
                      }
                    } catch (e: any) {
                      Alert.alert('오류', e.message || '공부 시간 조회 중 오류가 발생했습니다.');
                    }
                  }}
                >
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {item.name || item.email}
                    </Text>
                    <Text style={styles.memberEmail}>{item.email}</Text>
                    <Text style={styles.memberTime}>
                      총 공부 시간: {formatTime(item.studyTime || 0)}
                    </Text>
                    <Text style={styles.tapHint}>탭하여 상세 보기</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => setMembersModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 그룹 참여 모달 */}
      <Modal
        visible={joinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>그룹 참여</Text>
              <Text style={styles.modalDescription}>
                비공개 그룹 참여를 위한 8자리 초대 코드를 입력하세요
              </Text>
            <TextInput
              style={styles.codeInput}
              placeholder="ABCD1234"
              value={joinCode}
              onChangeText={(text) => {
                const upperText = text.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
                setJoinCode(upperText);
              }}
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setJoinModalVisible(false);
                  setJoinCode('');
                }}
              >
                <Text style={styles.modalButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleJoinGroup}
                disabled={loading || joinCode.length !== 8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>참여</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 초대 요청 알림 모달 */}
      <Modal
        visible={invitationsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInvitationsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedGroupForInvitations?.name} 참여 요청
            </Text>
            {invitations.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>대기 중인 참여 요청이 없습니다.</Text>
              </View>
            ) : (
              <FlatList
                data={invitations}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.invitationCard}>
                    <View style={styles.invitationInfo}>
                      <Text style={styles.invitationName}>
                        {item.userName || item.userEmail}
                      </Text>
                      <Text style={styles.invitationEmail}>{item.userEmail}</Text>
                      <Text style={styles.invitationDate}>
                        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                      </Text>
                    </View>
                    <View style={styles.invitationActions}>
                      <TouchableOpacity
                        style={[styles.invitationButton, styles.acceptButton]}
                        onPress={() => handleAcceptInvitation(item)}
                      >
                        <Text style={styles.invitationButtonText}>수락</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.invitationButton, styles.rejectButton]}
                        onPress={() => handleRejectInvitation(item)}
                      >
                        <Text style={styles.invitationButtonText}>거절</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => setInvitationsModalVisible(false)}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.text,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  joinButton: {
    backgroundColor: THEME.border,
  },
  createButton: {
    backgroundColor: THEME.primary,
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: THEME.textSecondary,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  groupCard: {
    backgroundColor: THEME.backgroundWhite,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupInfo: {
    marginBottom: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  groupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePublic: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  badgePrivate: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  groupDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 4,
  },
  groupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    padding: 8,
    backgroundColor: THEME.background,
    borderRadius: 8,
  },
  codeLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginRight: 8,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primary,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  groupMeta: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  groupMetaHint: {
    fontSize: 12,
    color: THEME.primary,
    fontWeight: '600',
  },
  groupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: THEME.border,
    alignItems: 'center',
  },
  inviteButton: {
    backgroundColor: THEME.primary,
  },
  leaveButton: {
    backgroundColor: THEME.error,
  },
  notificationButton: {
    backgroundColor: '#FFA500',
  },
  actionButtonText: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextPrimary: {
    color: '#ffffff',
  },
  leaveButtonText: {
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  modalScrollContent: {
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 16,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: THEME.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    backgroundColor: THEME.background,
    fontFamily: 'monospace',
  },
  publicOptionContainer: {
    marginBottom: 12,
  },
  publicOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 8,
  },
  publicOptionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  publicOptionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: THEME.border,
    backgroundColor: THEME.background,
    alignItems: 'center',
  },
  publicOptionButtonActive: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary,
  },
  publicOptionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  publicOptionButtonTextActive: {
    color: '#ffffff',
  },
  publicOptionHint: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontStyle: 'italic',
  },
  invitationCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  invitationInfo: {
    marginBottom: 12,
  },
  invitationName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  invitationEmail: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 4,
  },
  invitationDate: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  invitationButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: THEME.primary,
  },
  rejectButton: {
    backgroundColor: THEME.error,
  },
  invitationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: THEME.background,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: THEME.border,
  },
  confirmButton: {
    backgroundColor: THEME.primary,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  memberCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 4,
  },
  memberTime: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  tapHint: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default GroupScreen;
