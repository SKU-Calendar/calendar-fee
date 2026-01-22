import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import dayjs from 'dayjs';
import { type ParsedEvent } from '@/api/ai';
import { getEvents, type Event } from '@/api/events';
import { getColorForEvent, THEME } from '@/utils/colors';

type CalendarPreviewModalProps = {
  visible: boolean;
  previewEvents: ParsedEvent[]; // AI가 생성한 일정들
  onClose: () => void;
  onConfirm: (events: ParsedEvent[]) => Promise<void>;
};

const CalendarPreviewModal: React.FC<CalendarPreviewModalProps> = ({
  visible,
  previewEvents,
  onClose,
  onConfirm,
}) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [existingEvents, setExistingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const loadMonthEvents = useCallback(async (month: dayjs.Dayjs) => {
    setLoading(true);
    try {
      const startDate = month.startOf('month').format('YYYY-MM-DD');
      const endDate = month.endOf('month').format('YYYY-MM-DD');
      const response = await getEvents(startDate, endDate);
      if (response.success && response.data) {
        setExistingEvents(response.data);
      }
    } catch (error) {
      console.error('월 일정 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 미리보기 일정이 있는 월을 기준으로 설정
  useEffect(() => {
    if (previewEvents.length > 0 && visible) {
      const firstEventDate = dayjs(previewEvents[0].date);
      setCurrentMonth(firstEventDate);
      loadMonthEvents(firstEventDate);
    }
  }, [previewEvents, visible, loadMonthEvents]);

  // 월이 변경될 때 해당 월의 일정을 불러옴
  useEffect(() => {
    if (visible) {
      loadMonthEvents(currentMonth);
    }
  }, [currentMonth, visible, loadMonthEvents]);

  // 달력 계산
  const startOfMonth = currentMonth.startOf('month');
  const startDay = startOfMonth.day();
  const daysInMonth = currentMonth.daysInMonth();
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push({ label: '', iso: `empty-${i}`, isDay: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = currentMonth.date(i);
    calendarDays.push({
      label: i.toString(),
      iso: dateObj.format('YYYY-MM-DD'),
      isDay: true,
    });
  }

  // 각 날짜에 일정이 있는지 확인 (기존 + 미리보기)
  const getEventsForDate = (date: string) => {
    const existing = existingEvents.filter((e) => e.date === date);
    const preview = previewEvents.filter((e) => e.date === date);
    return { existing, preview };
  };

  const handleConfirm = async () => {
    setApplying(true);
    try {
      await onConfirm(previewEvents);
      Alert.alert('완료', '일정이 캘린더에 추가되었습니다.');
      onClose();
    } catch (error: any) {
      Alert.alert('오류', error.message || '일정 추가 중 오류가 발생했습니다.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>일정 미리보기</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            {/* 월 표시 및 이동 */}
            <View style={styles.monthHeader}>
              <TouchableOpacity
                onPress={() => {
                  setCurrentMonth(prev => prev.subtract(1, 'month'));
                }}
              >
                <Text style={styles.navText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {currentMonth.format('YYYY년 MM월')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setCurrentMonth(prev => prev.add(1, 'month'));
                }}
              >
                <Text style={styles.navText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* 요일 레이블 */}
            <View style={styles.weekLabels}>
              {daysOfWeek.map((day, i) => (
                <Text
                  key={day}
                  style={[
                    styles.weekLabelText,
                    i === 0 && { color: '#ef4444' },
                    i === 6 && { color: '#3b82f6' },
                  ]}
                >
                  {day}
                </Text>
              ))}
            </View>

            {/* 캘린더 그리드 */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.primary} />
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {calendarDays.map((d) => {
                  if (!d.isDay) {
                    return <View key={d.iso} style={styles.dayCell} />;
                  }

                  const { existing, preview } = getEventsForDate(d.iso);
                  const hasExisting = existing.length > 0;
                  const hasPreview = preview.length > 0;
                  const isToday = d.iso === dayjs().format('YYYY-MM-DD');

                  return (
                    <View key={d.iso} style={styles.dayCell}>
                      <Text
                        style={[
                          styles.dayText,
                          isToday && styles.todayText,
                        ]}
                      >
                        {d.label}
                      </Text>
                      {/* 기존 일정 점 */}
                      {hasExisting && (
                        <View style={[styles.eventDot, styles.existingDot]} />
                      )}
                      {/* 미리보기 일정 점 (초록색) */}
                      {hasPreview && (
                        <View style={[styles.eventDot, styles.previewDot]} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* 범례 */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.eventDot, styles.existingDot]} />
                <Text style={styles.legendText}>기존 일정</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.eventDot, styles.previewDot]} />
                <Text style={styles.legendText}>추가될 일정</Text>
              </View>
            </View>

            {/* 미리보기 일정 리스트 */}
            <View style={styles.previewEventsContainer}>
              <Text style={styles.previewEventsTitle}>
                추가될 일정 ({previewEvents.length}개)
              </Text>
              {previewEvents.map((event, index) => {
                const eventColor = getColorForEvent(event.title);
                return (
                  <View key={index} style={styles.previewEventItem}>
                    <View style={styles.previewEventInfo}>
                      <View style={styles.previewEventHeader}>
                        <View style={[styles.previewEventColorBar, { backgroundColor: eventColor }]} />
                        <Text style={styles.previewEventTitle}>{event.title}</Text>
                      </View>
                      <Text style={styles.previewEventDate}>
                        {dayjs(event.date).format('YYYY년 MM월 DD일')}
                      </Text>
                      {event.description && (
                        <Text style={styles.previewEventDescription}>
                          {event.description}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* 하단 버튼 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={applying}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, applying && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={applying}
            >
              {applying ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>적용하기</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.backgroundWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: THEME.borderLight,
  },
  closeButtonText: {
    fontSize: 20,
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: 0.3,
  },
  navText: {
    fontSize: 28,
    color: THEME.primary,
    fontWeight: '700',
  },
  weekLabels: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  weekLabelText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    color: THEME.textSecondary,
    fontSize: 13,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  dayText: {
    fontSize: 14,
    color: THEME.text,
    fontWeight: '500',
  },
  todayText: {
    fontWeight: '700',
    color: THEME.primary,
  },
  eventDot: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  existingDot: {
    backgroundColor: THEME.primary,
  },
  previewDot: {
    backgroundColor: THEME.success,
    right: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 28,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendText: {
    fontSize: 14,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  previewEventsContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
  },
  previewEventsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: THEME.text,
    letterSpacing: 0.3,
  },
  previewEventItem: {
    backgroundColor: THEME.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  previewEventInfo: {
    gap: 6,
  },
  previewEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewEventColorBar: {
    width: 5,
    height: 24,
    borderRadius: 3,
    marginRight: 12,
    backgroundColor: THEME.primary,
  },
  previewEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    flex: 1,
  },
  previewEventDate: {
    fontSize: 14,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  previewEventDescription: {
    fontSize: 14,
    color: THEME.textLight,
    marginTop: 6,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: THEME.borderLight,
  },
  cancelButtonText: {
    color: THEME.textSecondary,
    fontWeight: '700',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default CalendarPreviewModal;
