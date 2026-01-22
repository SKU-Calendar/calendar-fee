import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatWithAI, type ChatMessage, type ParsedEvent } from '@/api/ai';
import { createEvent, getCalendar } from '@/api/events';
import CalendarPreviewModal from '@/components/CalendarPreviewModal';
import { getColorForEvent, THEME } from '@/utils/colors';
import dayjs from 'dayjs';

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '안녕하세요! 일정을 도와드리는 AI 어시스턴트입니다. "1월 15일 회의 일정 추가해줘" 같은 요청을 보내주세요.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewEvents, setPreviewEvents] = useState<ParsedEvent[]>([]);
  const [calendarId, setCalendarId] = useState<string>('default'); // 기본 캘린더 ID
  const flatListRef = useRef<FlatList>(null);

  // 컴포넌트 마운트 시 캘린더 목록 조회하여 첫 번째 캘린더 ID 사용
  useEffect(() => {
    const loadCalendar = async () => {
      try {
        const response = await getCalendar();
        if (response.success && response.data && response.data.length > 0) {
          setCalendarId(response.data[0].id);
        }
      } catch (error) {
        console.error('캘린더 조회 실패:', error);
        // 실패해도 기본값 사용
      }
    };
    loadCalendar();
  }, []);

  // 메시지가 추가될 때 스크롤을 맨 아래로
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = inputText.trim();
    setInputText('');

    // 사용자 메시지 추가
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    try {
      // 대화 히스토리 구성 (최근 몇 개만 포함)
      const conversationHistory = messages.slice(-5);

      // 백엔드 API를 통해 AI 응답 받기
      const response = await chatWithAI({
        message: userMessage,
        calendarId: calendarId, // API 스펙에 맞게 calendarId 전달
        conversationHistory: conversationHistory,
      });

      if (response.success && response.message) {
        // AI 응답 메시지 추가
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
        };
        setMessages((prev) => [...prev, aiMessage]);

        // 일정이 파싱되었다면 미리보기 모달 표시
        if (response.events && response.events.length > 0) {
          setPreviewEvents(response.events);
          setPreviewModalVisible(true);
        }
      } else {
        // 에러 메시지 표시
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `죄송합니다. 오류가 발생했습니다: ${response.error || '알 수 없는 오류'}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyEvents = async (events: ParsedEvent[]) => {
    let successCount = 0;
    let failCount = 0;

    try {
      for (const event of events) {
        try {
          const color = getColorForEvent(event.title);
          
          // API 스펙에 맞게 ISO 8601 형식으로 변환
          const startAt = dayjs(event.date).startOf('day').toISOString();
          const endAt = dayjs(event.date).endOf('day').toISOString();
          
          // slots 배열 생성 (API 스펙에 필수)
          const slots = [{
            id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            slotStartAt: startAt,
            slotEndAt: endAt,
            slotIndex: 0,
            slotTitle: event.title,
            isDone: false,
            done: false,
          }];

          const response = await createEvent({
            status: 'active', // 기본 상태
            startAt: startAt,
            endAt: endAt,
            color: color,
            slots: slots,
            // 호환성 필드
            title: event.title,
            date: event.date,
            description: event.description,
            start_at: startAt,
            end_at: endAt,
          });

          if (response.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
          console.error('일정 추가 오류:', error);
        }
      }

      // 결과 메시지
      if (successCount > 0) {
        const resultMessage: ChatMessage = {
          role: 'assistant',
          content: `✅ ${successCount}개의 일정이 캘린더에 추가되었습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ''}`,
        };
        setMessages((prev) => [...prev, resultMessage]);
      } else if (failCount > 0) {
        throw new Error('일정 추가에 실패했습니다.');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={90}
      >
        {/* 메시지 리스트 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => `message-${index}`}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={THEME.primary} />
                <Text style={styles.loadingText}>AI가 생각하는 중...</Text>
              </View>
            ) : null
          }
        />

        {/* 입력 영역 */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="일정을 요청해주세요... (예: 내일 오후 2시 회의 일정 추가)"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!loading}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, (loading || !inputText.trim()) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={loading || !inputText.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>전송</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 일정 미리보기 모달 */}
      <CalendarPreviewModal
        visible={previewModalVisible}
        previewEvents={previewEvents}
        onClose={() => setPreviewModalVisible(false)}
        onConfirm={handleApplyEvents}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.backgroundWhite,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },
  messageText: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
    fontWeight: '400',
  },
  userMessageText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
    backgroundColor: THEME.backgroundWhite,
    alignItems: 'flex-end',
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: THEME.border,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 15,
    backgroundColor: THEME.background,
  },
  sendButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: THEME.textLight,
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: THEME.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ChatScreen;
