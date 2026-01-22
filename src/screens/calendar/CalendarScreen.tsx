import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, PanResponder, Animated, Dimensions, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { getEventsByDate, getEvents, createEvent, updateEvent, deleteEvent, getCalendar, createCalendar, type Event } from '@/api/events';
import { getEventColor, getColorForEvent, EVENT_COLORS, THEME } from '@/utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 날짜 선택 컴포넌트 (Modal 내부에서 사용)
type DatePickerProps = {
  visible: boolean;
  currentDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
};

// 색상 선택 컴포넌트 (Modal 내부에서 사용)
type ColorPickerProps = {
  visible: boolean;
  selectedColor: string | null;
  eventTitle: string;
  onSelect: (color: string | null) => void;
  onClose: () => void;
};

const ColorPicker: React.FC<ColorPickerProps> = ({ visible, selectedColor, eventTitle, onSelect, onClose }) => {
  if (!visible) return null;

  return (
    <View style={styles.colorPickerOverlayContainer}>
      <TouchableOpacity style={styles.colorPickerOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.colorPickerContainer}>
            <Text style={styles.colorPickerTitle}>색상 선택</Text>
            <View style={styles.colorPalette}>
              <TouchableOpacity style={styles.colorOptionContainer} onPress={() => { onSelect(null); onClose(); }}>
                <View style={[styles.colorOption, !selectedColor && styles.colorOptionSelected, { backgroundColor: getColorForEvent(eventTitle || '') }]}>
                  {!selectedColor && <View style={styles.colorOptionCheckmark} />}
                </View>
                <Text style={styles.colorOptionLabel}>자동</Text>
              </TouchableOpacity>
              {EVENT_COLORS.map((color) => (
                <TouchableOpacity key={color} style={styles.colorOptionContainer} onPress={() => { onSelect(color); onClose(); }}>
                  <View style={[styles.colorOption, selectedColor === color && styles.colorOptionSelected, { backgroundColor: color }]}>
                    {selectedColor === color && <View style={styles.colorOptionCheckmark} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const DatePicker: React.FC<DatePickerProps> = ({ visible, currentDate, onSelect, onClose }) => {
  const [selectedMonth, setSelectedMonth] = useState(dayjs(currentDate || dayjs().format('YYYY-MM-DD')));
  
  useEffect(() => {
    if (currentDate) {
      setSelectedMonth(dayjs(currentDate));
    }
  }, [currentDate]);

  if (!visible) return null;

  const startOfMonth = selectedMonth.startOf('month');
  const daysInMonth = selectedMonth.daysInMonth();
  const startDay = startOfMonth.day();

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push({ label: '', iso: `empty-${i}`, isDay: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = selectedMonth.date(i);
    calendarDays.push({
      label: i.toString(),
      iso: dateObj.format('YYYY-MM-DD'),
      isDay: true,
    });
  }

  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    const week = [...calendarDays.slice(i, i + 7)];
    while (week.length < 7) {
      week.push({ label: '', iso: `empty-${i + week.length}`, isDay: false });
    }
    weeks.push(week);
  }

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <View style={styles.datePickerOverlayContainer}>
      <TouchableOpacity style={styles.datePickerOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setSelectedMonth(prev => prev.subtract(1, 'month'))}>
                <Text style={styles.datePickerNav}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>{selectedMonth.format('YYYY년 MM월')}</Text>
              <TouchableOpacity onPress={() => setSelectedMonth(prev => prev.add(1, 'month'))}>
                <Text style={styles.datePickerNav}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerWeekLabels}>
              {daysOfWeek.map((day, i) => (
                <Text key={day} style={[styles.datePickerWeekLabel, i === 0 && { color: '#ef4444' }, i === 6 && { color: '#3b82f6' }]}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.datePickerGrid}>
              {weeks.map((week, weekIndex) => (
                <View key={weekIndex} style={styles.datePickerWeekRow}>
                  {week.map((d) => {
                    const isSelected = d.iso === currentDate;
                    const isToday = d.iso === dayjs().format('YYYY-MM-DD');
                    return (
                      <TouchableOpacity
                        key={d.iso}
                        disabled={!d.isDay}
                        style={[styles.datePickerDayCell, isSelected && styles.datePickerDaySelected]}
                        onPress={() => {
                          onSelect(d.iso);
                          onClose();
                        }}
                      >
                        <Text style={[styles.datePickerDayText, isToday && styles.datePickerTodayText, isSelected && { color: '#fff' }]}>
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const CalendarScreen: React.FC = () => {
  const [viewDate, setViewDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [events, setEvents] = useState<Event[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventStartDate, setNewEventStartDate] = useState<string>('');
  const [newEventEndDate, setNewEventEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [eventFormVisible, setEventFormVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'start' | 'end'>('start');
  const [calendarId, setCalendarId] = useState<string>('default'); // 기본 캘린더 ID

  const translateX = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  // 컴포넌트 마운트 시 캘린더 목록 조회
  useEffect(() => {
    const loadCalendar = async () => {
      try {
        const response = await getCalendar();
        if (response.success && response.data && response.data.length > 0) {
          const loadedCalendarId = response.data[0].id;
          setCalendarId(loadedCalendarId);
          console.log('캘린더 로드 완료:', loadedCalendarId);
        } else {
          // 캘린더가 없으면 생성
          console.log('캘린더가 없습니다. 생성 중...');
          const createResponse = await createCalendar(Intl.DateTimeFormat().resolvedOptions().timeZone);
          if (createResponse.success && createResponse.data) {
            const createdCalendarId = createResponse.data.id;
            setCalendarId(createdCalendarId);
            console.log('캘린더 생성 완료:', createdCalendarId);
          } else {
            console.error('캘린더 생성 실패:', createResponse.error);
          }
        }
      } catch (error) {
        console.error('캘린더 조회/생성 실패:', error);
      }
    };
    loadCalendar();
  }, []);
  
  // calendarId가 변경되면 일정 다시 로드
  useEffect(() => {
    if (calendarId !== 'default') {
      loadMonthEvents();
    }
  }, [calendarId, viewDate]);

  // --- 스와이프 제스처 처리 수정 ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return !isAnimating && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isAnimating) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isAnimating) return;
        
        const SWIPE_THRESHOLD = 30;
        const SWIPE_VELOCITY_THRESHOLD = 0.25;

        const shouldSwipe = 
          Math.abs(gestureState.dx) > SWIPE_THRESHOLD || 
          Math.abs(gestureState.vx) > SWIPE_VELOCITY_THRESHOLD;

        if (shouldSwipe) {
          setIsAnimating(true);
          
          const isRightSwipe = gestureState.dx > 0;
          const targetX = isRightSwipe ? SCREEN_WIDTH : -SCREEN_WIDTH;
          
          if (isRightSwipe) {
            setViewDate((prev) => prev.subtract(1, 'month'));
          } else {
            setViewDate((prev) => prev.add(1, 'month'));
          }
          
          Animated.timing(translateX, {
            toValue: targetX,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0);
            setIsAnimating(false);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 7,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (!isAnimating) {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  // 월의 모든 일정을 로드 (viewDate 변경 시) - calendarId가 로드된 후에만 실행
  useEffect(() => {
    if (calendarId !== 'default') {
      loadMonthEvents();
    }
  }, [viewDate]);

  const loadMonthEvents = async () => {
    // calendarId가 'default'이면 아직 캘린더가 로드되지 않았으므로 대기
    if (calendarId === 'default') {
      console.log('캘린더 ID가 아직 로드되지 않았습니다. 대기 중...');
      return;
    }
    
    setLoading(true);
    try {
      const startDate = viewDate.startOf('month').format('YYYY-MM-DD');
      const endDate = viewDate.endOf('month').format('YYYY-MM-DD');
      // GET /api/calendar/{userId}/{calendarId} 사용
      const response = await getEvents(calendarId, startDate, endDate);
      if (response.success && response.data) {
        setEvents(response.data);
      }
    } catch (error) {
      console.error('월 일정 조회 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const startOfMonth = viewDate.startOf('month');
  const daysInMonth = viewDate.daysInMonth();
  const startDay = startOfMonth.day();

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push({ label: '', iso: `empty-${i}`, isDay: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = viewDate.date(i);
    calendarDays.push({
      label: i.toString(),
      iso: dateObj.format('YYYY-MM-DD'),
      isDay: true,
    });
  }

  // 7개씩 나누어 주(week) 배열 생성
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    const week = [...calendarDays.slice(i, i + 7)];
    while (week.length < 7) {
      week.push({ label: '', iso: `empty-${i + week.length}`, isDay: false });
    }
    weeks.push(week);
  }

  // 기간이 있는 일정인지 확인하고 날짜 범위 가져오기
  const getEventDateRange = (event: Event) => {
    // API 스펙에 맞게 startAt, endAt 사용 (호환성을 위해 start_at, end_at도 확인)
    const startAt = event.startAt || event.start_at;
    const endAt = event.endAt || event.end_at;
    
    if (startAt && endAt) {
      const start = dayjs(startAt);
      const end = dayjs(endAt);
      return { start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD'), hasRange: true };
    }
    
    // date 필드가 있으면 사용, 없으면 startAt에서 추출
    if (event.date) {
      return { start: event.date, end: event.date, hasRange: false };
    }
    
    if (startAt) {
      const start = dayjs(startAt);
      return { start: start.format('YYYY-MM-DD'), end: start.format('YYYY-MM-DD'), hasRange: false };
    }
    
    return { start: dayjs().format('YYYY-MM-DD'), end: dayjs().format('YYYY-MM-DD'), hasRange: false };
  };

  // 특정 날짜에 표시할 일정들 가져오기 (기간 일정 포함)
  const getEventsForDate = (date: string) => {
    return events.filter(event => {
      const range = getEventDateRange(event);
      const dateObj = dayjs(date);
      const startObj = dayjs(range.start);
      const endObj = dayjs(range.end);
      return (dateObj.isAfter(startObj, 'day') || dateObj.isSame(startObj, 'day')) && 
             (dateObj.isBefore(endObj, 'day') || dateObj.isSame(endObj, 'day'));
    });
  };

  const handleAddEvent = async () => {
    if (!newEventTitle.trim()) {
      Alert.alert('알림', '일정 제목을 입력해주세요.');
      return;
    }

    if (!newEventStartDate) {
      Alert.alert('알림', '시작일을 선택해주세요.');
      return;
    }

    const startDate = newEventStartDate || selectedDate;
    const endDate = newEventEndDate || startDate;

    if (dayjs(endDate).isBefore(startDate)) {
      Alert.alert('알림', '종료일은 시작일보다 늦거나 같아야 합니다.');
      return;
    }

    setAdding(true);
    try {
      const color = selectedColor || getColorForEvent(newEventTitle.trim());

      // API 스펙에 맞게 ISO 8601 형식으로 변환
      const startAt = dayjs(startDate).startOf('day').toISOString();
      const endAt = dayjs(endDate).endOf('day').toISOString();

      // slots 배열 생성 (API 스펙에 필수)
      const slots = [{
        id: `slot-${Date.now()}`,
        slotStartAt: startAt,
        slotEndAt: endAt,
        slotIndex: 0,
        slotTitle: newEventTitle.trim(),
        isDone: false,
        done: false,
      }];

      const response = editingEvent 
        ? await updateEvent(editingEvent.id, {
            status: 'active', // 기본 상태
            startAt: startAt,
            endAt: endAt,
            color: color,
            slots: slots,
            // 호환성 필드
            title: newEventTitle.trim(),
            date: startDate,
            description: newEventDescription.trim() || undefined,
            start_at: startAt,
            end_at: endAt,
          })
        : await createEvent({
            status: 'active', // 기본 상태
            startAt: startAt,
            endAt: endAt,
            color: color,
            slots: slots,
            // 호환성 필드
            calendar_id: calendarId, // 캘린더 ID 전달
            title: newEventTitle.trim(),
            date: startDate,
            description: newEventDescription.trim() || undefined,
            start_at: startAt,
            end_at: endAt,
          });

      if (response.success && response.data) {
        await loadMonthEvents();
        setNewEventTitle('');
        setNewEventDescription('');
        setNewEventStartDate('');
        setNewEventEndDate('');
        setSelectedColor(null);
        setEditingEvent(null);
        handleCloseEventForm();
      } else {
        // 에러 발생 시 사용자에게 알림
        Alert.alert(
          '일정 생성 실패',
          response.error || '일정을 생성하는데 실패했습니다.',
          [{ text: '확인' }]
        );
      }
    } catch (error: any) {
      console.error('일정 생성 오류:', error);
      Alert.alert(
        '오류',
        error.message || '일정을 생성하는데 오류가 발생했습니다.'
      );
    } finally {
      setAdding(false);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    // title이 없으면 slots[0]?.slotTitle 사용
    const eventTitle = event.title || event.slots?.[0]?.slotTitle || '';
    setNewEventTitle(eventTitle);
    setNewEventDescription(event.description || '');
    const range = getEventDateRange(event);
    setNewEventStartDate(range.start);
    setNewEventEndDate(range.end);
    setSelectedColor(event.color || null);
    setEventFormVisible(true);
  };

  const handleDeleteEvent = async (id: string) => {
    Alert.alert('일정 삭제', '정말 이 일정을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const response = await deleteEvent(id);
          if (response.success) {
            await loadMonthEvents();
          }
        },
      },
    ]);
  };

  const handleOpenEventForm = () => {
    setEditingEvent(null);
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventStartDate(selectedDate);
    setNewEventEndDate(selectedDate);
    setSelectedColor(null);
    setEventFormVisible(true);
  };

  const handleCloseEventForm = () => {
    setEventFormVisible(false);
    setEditingEvent(null);
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventStartDate('');
    setNewEventEndDate('');
    setSelectedColor(null);
  };

  const filteredEvents = getEventsForDate(selectedDate);
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View 
          style={styles.scrollView}
        >
          <View style={styles.monthHeader}>
            <Text style={styles.headerTitle}>{viewDate.format('YYYY년 MM월')}</Text>
          </View>

          <View style={styles.weekLabels}>
            {daysOfWeek.map((day, i) => (
              <Text key={day} style={[styles.weekLabelText, i === 0 && { color: '#ef4444' }, i === 6 && { color: '#3b82f6' }]}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarContainer} {...panResponder.panHandlers}>
        <Animated.View style={[styles.calendarContent, { transform: [{ translateX }] }]}>
          <View style={styles.gridContainer}>
            {weeks.map((week, weekIndex) => (
              <View key={`${viewDate.format('YYYY-MM')}-${weekIndex}`} style={styles.weekRow}>
                {week.map((d) => {
                  const isSelected = d.iso === selectedDate;
                  const isToday = d.iso === dayjs().format('YYYY-MM-DD');
                  const dayEvents = d.isDay ? getEventsForDate(d.iso) : [];
                  
                  // 기간 일정들과 단일 일정들을 구분
                  const rangeEvents = dayEvents.filter(e => {
                    const range = getEventDateRange(e);
                    return range.hasRange && range.start !== range.end;
                  });
                  const singleEvents = dayEvents.filter(e => {
                    const range = getEventDateRange(e);
                    return !range.hasRange || range.start === range.end;
                  });

                  return (
                    <TouchableOpacity
                      key={d.iso}
                      disabled={!d.isDay || isAnimating}
                      style={[styles.dayCell, isSelected && styles.daySelected]}
                      onPress={() => d.isDay && setSelectedDate(d.iso)}
                    >
                      <Text style={[styles.dayText, isToday && styles.todayText, isSelected && { color: '#fff' }]}>
                        {d.label}
                      </Text>
                      {d.isDay && (
                        <View style={styles.eventLabelsContainer}>
                          {/* 기간 일정 막대들 - 세로로 배치 */}
                          {rangeEvents.map((event) => {
                            const range = getEventDateRange(event);
                            const eventColor = getEventColor(event);
                            const startObj = dayjs(range.start);
                            const endObj = dayjs(range.end);
                            const currentObj = dayjs(d.iso);
                            const isStart = currentObj.isSame(startObj, 'day');
                            const isEnd = currentObj.isSame(endObj, 'day');
                            
                            // 현재 주의 첫날과 마지막날 확인
                            const weekStart = currentObj.startOf('week');
                            const weekEnd = currentObj.endOf('week');
                            const isWeekStart = currentObj.isSame(weekStart, 'day');
                            const isWeekEnd = currentObj.isSame(weekEnd, 'day');
                            
                            // 일정이 주의 시작일 이전에 시작하는지
                            const startsBeforeWeek = startObj.isBefore(weekStart, 'day');
                            // 일정이 주의 종료일 이후에 끝나는지
                            const endsAfterWeek = endObj.isAfter(weekEnd, 'day');
                            
                            return (
                              <View 
                                key={event.id} 
                                style={[
                                  styles.eventRangeBar,
                                  { 
                                    backgroundColor: eventColor,
                                    marginLeft: isStart ? 2 : (isWeekStart && startsBeforeWeek ? 0 : -1),
                                    marginRight: isEnd ? 2 : (isWeekEnd && endsAfterWeek ? 0 : -1),
                                    paddingLeft: isStart ? 4 : 0,
                                    paddingRight: isEnd ? 4 : 0,
                                    borderTopLeftRadius: isStart ? 4 : 0,
                                    borderBottomLeftRadius: isStart ? 4 : 0,
                                    borderTopRightRadius: isEnd ? 4 : 0,
                                    borderBottomRightRadius: isEnd ? 4 : 0,
                                  }
                                ]}
                              >
                                {isStart && (
                                  <Text 
                                    style={styles.eventRangeBarText}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                  >
                                    {event.title || event.slots?.[0]?.slotTitle || '일정'}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                          {/* 단일 일정 라벨들 - 세로로 배치 */}
                          {singleEvents.map((event) => {
                            const eventColor = getEventColor(event);
                            const eventTitle = event.title || event.slots?.[0]?.slotTitle || '일정';
                            return (
                              <View key={event.id} style={[styles.eventLabel, { backgroundColor: eventColor }]}>
                                <Text style={styles.eventLabelText} numberOfLines={1} ellipsizeMode="tail">
                                  {eventTitle}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      <View style={styles.divider} />

      <View style={styles.selectedDateInfo}>
        <Text style={styles.infoText}>{dayjs(selectedDate).format('MM월 DD일')} 일정</Text>
        <TouchableOpacity 
          style={styles.addEventButton} 
          onPress={handleOpenEventForm}
          disabled={adding}
        >
          <Text style={styles.addEventButtonText}>+ 일정 추가</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={eventFormVisible} transparent animationType="slide" onRequestClose={handleCloseEventForm}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={handleCloseEventForm}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.eventFormContainer}>
                <View style={styles.eventFormHeader}>
                  <Text style={styles.eventFormTitle}>{editingEvent ? '일정 수정' : '일정 추가'}</Text>
                  <TouchableOpacity onPress={handleCloseEventForm}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                <DatePicker
                  visible={datePickerVisible}
                  currentDate={datePickerType === 'start' ? newEventStartDate : newEventEndDate}
                  onSelect={(date) => {
                    if (datePickerType === 'start') {
                      setNewEventStartDate(date);
                      if (!newEventEndDate || dayjs(date).isAfter(newEventEndDate)) {
                        setNewEventEndDate(date);
                      }
                    } else {
                      setNewEventEndDate(date);
                    }
                    setDatePickerVisible(false);
                  }}
                  onClose={() => setDatePickerVisible(false)}
                />

                <ColorPicker
                  visible={colorPickerVisible}
                  selectedColor={selectedColor}
                  eventTitle={newEventTitle}
                  onSelect={(color) => setSelectedColor(color)}
                  onClose={() => setColorPickerVisible(false)}
                />

                <ScrollView style={styles.eventFormScroll} showsVerticalScrollIndicator={false}>
                  <View style={styles.eventFormField}>
                    <Text style={styles.eventFormLabel}>제목 *</Text>
                    <TextInput
                      style={styles.eventFormInput}
                      placeholder="일정 제목"
                      value={newEventTitle}
                      onChangeText={setNewEventTitle}
                      editable={!adding}
                    />
                  </View>

                  <View style={styles.eventFormField}>
                    <Text style={styles.eventFormLabel}>세부 정보</Text>
                    <TextInput
                      style={[styles.eventFormInput, styles.eventFormTextArea]}
                      placeholder="세부 정보를 입력하세요"
                      value={newEventDescription}
                      onChangeText={setNewEventDescription}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      editable={!adding}
                    />
                  </View>

                  <View style={styles.eventFormField}>
                    <Text style={styles.eventFormLabel}>시작일 *</Text>
                    <TouchableOpacity
                      style={styles.eventFormInput}
                      onPress={() => {
                        setDatePickerType('start');
                        setDatePickerVisible(true);
                      }}
                      disabled={adding}
                    >
                      <Text style={[styles.eventFormDateText, !newEventStartDate && styles.eventFormDatePlaceholder]}>
                        {newEventStartDate ? dayjs(newEventStartDate).format('YYYY년 MM월 DD일') : '시작일 선택'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.eventFormField}>
                    <Text style={styles.eventFormLabel}>종료일</Text>
                    <TouchableOpacity
                      style={styles.eventFormInput}
                      onPress={() => {
                        setDatePickerType('end');
                        setDatePickerVisible(true);
                      }}
                      disabled={adding}
                    >
                      <Text style={[styles.eventFormDateText, !newEventEndDate && styles.eventFormDatePlaceholder]}>
                        {newEventEndDate ? dayjs(newEventEndDate).format('YYYY년 MM월 DD일') : '종료일 선택 (선택사항)'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.eventFormField}>
                    <Text style={styles.eventFormLabel}>색상</Text>
                    <TouchableOpacity 
                      style={styles.eventFormColorRow} 
                      onPress={() => setColorPickerVisible(true)} 
                      disabled={adding}
                    >
                      <View style={[styles.eventFormColorIndicator, { backgroundColor: selectedColor || getColorForEvent(newEventTitle || '') }]} />
                      <Text style={styles.eventFormColorText}>
                        {selectedColor ? '색상 선택됨' : '자동'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                <View style={styles.eventFormActions}>
                  {editingEvent && (
                    <TouchableOpacity 
                      style={[styles.eventFormDeleteButton]} 
                      onPress={() => {
                        Alert.alert('일정 삭제', '정말 이 일정을 삭제하시겠습니까?', [
                          { text: '취소', style: 'cancel' },
                          {
                            text: '삭제',
                            style: 'destructive',
                            onPress: async () => {
                              await handleDeleteEvent(editingEvent.id);
                              handleCloseEventForm();
                            },
                          },
                        ]);
                      }}
                      disabled={adding}
                    >
                      <Text style={styles.eventFormDeleteText}>삭제</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.eventFormCancelButton]} 
                    onPress={handleCloseEventForm}
                    disabled={adding}
                  >
                    <Text style={styles.eventFormCancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.eventFormSubmitButton, adding && styles.buttonDisabled]} 
                    onPress={handleAddEvent} 
                    disabled={adding}
                  >
                    {adding ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.eventFormSubmitText}>{editingEvent ? '수정' : '추가'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

          <View style={styles.eventsContainer}>
            {loading && events.length === 0 ? (
              <View style={styles.loadingContainer}><ActivityIndicator size="large" color={THEME.primary} /></View>
            ) : (
              <FlatList
                data={filteredEvents}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={<Text style={styles.emptyText}>일정이 없습니다.</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.eventItem}
                    onPress={() => handleEditEvent(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.eventItemContent}>
                      <View style={[styles.eventColorBar, { backgroundColor: getEventColor(item) }]} />
                      <View style={styles.eventItemTextContainer}>
                        <Text style={styles.eventTitle}>{item.title || item.slots?.[0]?.slotTitle || '일정'}</Text>
                        {(() => {
                          const range = getEventDateRange(item);
                          if (range.hasRange && range.start !== range.end) {
                            return (
                              <Text style={styles.eventDateRange}>
                                {dayjs(range.start).format('MM/DD')} - {dayjs(range.end).format('MM/DD')}
                              </Text>
                            );
                          }
                          return null;
                        })()}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteEvent(item.id)}>
                      <Text style={styles.deleteText}>삭제</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background, paddingHorizontal: 16 },
  keyboardAvoidingView: { flex: 1 },
  scrollView: { flex: 1, paddingBottom: 20 },
  monthHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 6, marginBottom: 6, paddingVertical: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: THEME.text, letterSpacing: 0.3 },
  calendarContainer: { backgroundColor: THEME.backgroundWhite, borderRadius: 20, padding: 10, marginBottom: 4, shadowColor: THEME.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, flex: 1 },
  calendarContent: { width: '100%' },
  weekLabels: { flexDirection: 'row', marginBottom: 6, paddingHorizontal: 4 },
  weekLabelText: { flex: 1, textAlign: 'center', fontWeight: '600', color: THEME.textSecondary, fontSize: 13 },
  gridContainer: { width: '100%' },
  weekRow: { flexDirection: 'row', width: '100%', position: 'relative' },
  dayCell: { flex: 1, minHeight: 80, justifyContent: 'flex-start', alignItems: 'center', marginBottom: 3, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 0 },
  daySelected: { backgroundColor: THEME.primary },
  dayText: { fontSize: 15, color: THEME.text, fontWeight: '500', marginBottom: 2 },
  todayText: { fontWeight: '700', color: THEME.primary },
  eventLabelsContainer: { width: '100%', alignItems: 'center', marginTop: 2, gap: 2 },
  eventLabel: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, width: '95%', minHeight: 16, justifyContent: 'center' },
  eventLabelText: { fontSize: 9, color: '#ffffff', fontWeight: '500', textAlign: 'center' },
  eventRangeBar: { paddingVertical: 2, minHeight: 16, width: '100%', justifyContent: 'center', marginBottom: 2 },
  eventRangeBarText: { fontSize: 9, color: '#ffffff', fontWeight: '500', flexShrink: 0, overflow: 'visible' },
  divider: { height: 1, backgroundColor: THEME.borderLight, marginVertical: 8 },
  selectedDateInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingLeft: 4, paddingRight: 4 },
  infoText: { fontSize: 16, fontWeight: '700', color: THEME.text },
  addEventButton: { backgroundColor: THEME.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  addEventButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  colorPickerTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  colorOptionContainer: { alignItems: 'center' },
  colorOption: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  colorOptionSelected: { borderColor: THEME.primary, borderWidth: 3 },
  colorOptionCheckmark: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  colorOptionLabel: { fontSize: 12, marginTop: 6, color: THEME.textSecondary },
  eventItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, marginBottom: 4, backgroundColor: THEME.backgroundWhite, borderRadius: 16 },
  eventItemContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  eventItemTextContainer: { flex: 1 },
  eventColorBar: { width: 5, height: 36, borderRadius: 3, marginRight: 14 },
  eventTitle: { fontSize: 16, flex: 1, color: THEME.text },
  eventDateRange: { fontSize: 12, color: THEME.textSecondary, marginTop: 2 },
  deleteText: { color: THEME.error, fontWeight: '600', paddingHorizontal: 12 },
  emptyText: { textAlign: 'center', marginTop: 10, color: THEME.textLight },
  buttonDisabled: { opacity: 0.6 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: 10, minHeight: 60 },
  eventsContainer: { maxHeight: 220, flex: 0 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  eventFormContainer: { backgroundColor: THEME.backgroundWhite, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 20 : 10, position: 'relative' },
  eventFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: THEME.borderLight },
  eventFormTitle: { fontSize: 20, fontWeight: '700', color: THEME.text },
  closeButton: { fontSize: 24, color: THEME.textSecondary, lineHeight: 24 },
  eventFormScroll: { maxHeight: 400, paddingHorizontal: 20 },
  eventFormField: { marginTop: 20 },
  eventFormLabel: { fontSize: 14, fontWeight: '600', color: THEME.text, marginBottom: 8 },
  eventFormInput: { borderWidth: 1.5, borderColor: THEME.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: THEME.backgroundWhite, fontSize: 16, color: THEME.text, justifyContent: 'center' },
  eventFormDateText: { fontSize: 16, color: THEME.text },
  eventFormDatePlaceholder: { color: THEME.textLight },
  eventFormTextArea: { minHeight: 100, paddingTop: 12 },
  eventFormColorRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: THEME.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: THEME.backgroundWhite },
  eventFormColorIndicator: { width: 32, height: 32, borderRadius: 16, marginRight: 12, borderWidth: 2, borderColor: THEME.borderLight },
  eventFormColorText: { fontSize: 16, color: THEME.text },
  eventFormActions: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 12, borderTopWidth: 1, borderTopColor: THEME.borderLight },
  eventFormCancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: THEME.borderLight, alignItems: 'center' },
  eventFormCancelText: { fontSize: 16, fontWeight: '600', color: THEME.text },
  eventFormDeleteButton: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: THEME.error, alignItems: 'center' },
  eventFormDeleteText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  eventFormSubmitButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: THEME.primary, alignItems: 'center' },
  eventFormSubmitText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  datePickerOverlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  datePickerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  datePickerContainer: { backgroundColor: THEME.backgroundWhite, borderRadius: 24, padding: 20, width: '90%', maxWidth: 400 },
  colorPickerOverlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  colorPickerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  colorPickerContainer: { backgroundColor: THEME.backgroundWhite, borderRadius: 24, padding: 24, width: '80%' },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  datePickerTitle: { fontSize: 18, fontWeight: '700', color: THEME.text },
  datePickerNav: { fontSize: 24, color: THEME.primary, fontWeight: '700', paddingHorizontal: 16 },
  datePickerWeekLabels: { flexDirection: 'row', marginBottom: 8 },
  datePickerWeekLabel: { flex: 1, textAlign: 'center', fontWeight: '600', color: THEME.textSecondary, fontSize: 13 },
  datePickerGrid: { marginTop: 8 },
  datePickerWeekRow: { flexDirection: 'row', marginBottom: 4 },
  datePickerDayCell: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8, margin: 2 },
  datePickerDaySelected: { backgroundColor: THEME.primary },
  datePickerDayText: { fontSize: 14, color: THEME.text, fontWeight: '500' },
  datePickerTodayText: { fontWeight: '700', color: THEME.primary },
});

export default CalendarScreen;
