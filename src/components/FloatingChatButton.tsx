import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatScreen from '@/screens/chat/ChatScreen';
import { THEME } from '@/utils/colors';

const FloatingChatButton: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  
  // 탭 바 높이(60) + 여유 공간(16) + 하단 safe area
  const bottomOffset = 60 + 16 + insets.bottom;

  return (
    <>
      {/* 플로팅 버튼 */}
      <TouchableOpacity
        style={[styles.floatingButton, { bottom: bottomOffset }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonIcon}>💬</Text>
      </TouchableOpacity>

      {/* 챗봇 모달 */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          />
          <View style={styles.modalContainer}>
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>AI 챗봇</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chatWrapper}>
                <ChatScreen />
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: THEME.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 1000,
  },
  buttonIcon: {
    fontSize: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '85%',
    backgroundColor: THEME.backgroundWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  safeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
    backgroundColor: THEME.backgroundWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalTitle: {
    fontSize: 20,
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
  chatWrapper: {
    flex: 1,
  },
});

export default FloatingChatButton;
