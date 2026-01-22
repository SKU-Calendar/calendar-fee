import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { startTimer, pauseTimer, resumeTimer, stopTimer } from '@/api/timer';
import { THEME } from '@/utils/colors';

type TimerStatus = 'idle' | 'running' | 'paused';

const TimerScreen: React.FC = () => {
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [elapsedTime, setElapsedTime] = useState(0); // 초 단위
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [timerId, setTimerId] = useState<string | null>(null); // start 응답 id → stop 시 전달
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 타이머 업데이트
  useEffect(() => {
    if (status === 'running' && startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status, startTime]);

  const handleStart = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const response = await startTimer();
      if (response.success) {
        const data = response.data as { timerId?: string; id?: string } | undefined;
        setTimerId(data?.timerId ?? data?.id ?? null);
        setStatus('running');
        setStartTime(new Date());
      } else {
        Alert.alert('오류', response.message || response.error || '타이머 시작에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '타이머 시작 중 오류가 발생했습니다.');
    } finally {
      setRequesting(false);
    }
  };

  const handlePause = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const response = await pauseTimer();
      if (response.success) {
        setStatus('paused');
      } else {
        Alert.alert('오류', response.message || response.error || '타이머 일시정지에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '타이머 일시정지 중 오류가 발생했습니다.');
    } finally {
      setRequesting(false);
    }
  };

  const handleResume = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const response = await resumeTimer();
      if (response.success) {
        setStatus('running');
        const pausedTime = elapsedTime;
        setStartTime(new Date(Date.now() - pausedTime * 1000));
      } else {
        Alert.alert('오류', response.message || response.error || '타이머 재개에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '타이머 재개 중 오류가 발생했습니다.');
    } finally {
      setRequesting(false);
    }
  };

  const handleStop = () => {
    Alert.alert(
      '타이머 종료',
      '공부 시간을 기록하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '기록',
          onPress: async () => {
            if (requesting) return;
            setRequesting(true);
            try {
              const response = await stopTimer(elapsedTime, timerId);
              if (response.success) {
                setTimerId(null);
                setStatus('idle');
                setElapsedTime(0);
                setStartTime(null);
                Alert.alert('완료', '공부 시간이 기록되었습니다.');
              } else {
                Alert.alert('오류', response.message || response.error || '타이머 종료에 실패했습니다.');
              }
            } catch (error: any) {
              Alert.alert('오류', error.message || '타이머 종료 중 오류가 발생했습니다.');
            } finally {
              setRequesting(false);
            }
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>공부 시간 측정</Text>
      
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
        <Text style={styles.statusText}>
          {status === 'idle' && '대기 중'}
          {status === 'running' && '공부 중'}
          {status === 'paused' && '일시정지'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {status === 'idle' && (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={handleStart}
            disabled={requesting}
          >
            <Text style={styles.buttonText}>{requesting ? '시작 중…' : '시작'}</Text>
          </TouchableOpacity>
        )}

        {status === 'running' && (
          <>
            <TouchableOpacity
              style={[styles.button, styles.pauseButton]}
              onPress={handlePause}
              disabled={requesting}
            >
              <Text style={styles.buttonText}>일시정지</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStop}
              disabled={requesting}
            >
              <Text style={styles.buttonText}>종료</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'paused' && (
          <>
            <TouchableOpacity
              style={[styles.button, styles.resumeButton]}
              onPress={handleResume}
              disabled={requesting}
            >
              <Text style={styles.buttonText}>{requesting ? '재개 중…' : '재개'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStop}
              disabled={requesting}
            >
              <Text style={styles.buttonText}>종료</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 40,
    color: THEME.text,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  timerText: {
    fontSize: 72,
    fontWeight: '700',
    color: THEME.primary,
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
  },
  statusText: {
    fontSize: 18,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButton: {
    backgroundColor: THEME.primary,
  },
  pauseButton: {
    backgroundColor: '#FFA500',
  },
  resumeButton: {
    backgroundColor: THEME.primary,
  },
  stopButton: {
    backgroundColor: THEME.error,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default TimerScreen;
