import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Settings, X } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { useSchedule } from '@/src/context/ScheduleContext';
import { useChat } from '@/src/context/ChatContext';

interface NotificationTopBarProps {
  title: string;
}

export function NotificationTopBar({ title }: NotificationTopBarProps) {
  const router = useRouter();
  const { notifications, removeNotification } = useSchedule();
  const { unreadMessages, markAsRead } = useChat();
  const [sidePanelVisible, setSidePanelVisible] = useState(false);

  const nonChatNotifs = notifications.filter((n) => n.type !== '채팅 신규메시지');
  const unreadCount = nonChatNotifs.length + unreadMessages.length;

  return (
    <>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>{title}</Text>
        <View style={styles.topBarIcons}>
          <TouchableOpacity
            onPress={() => setSidePanelVisible(true)}
            style={styles.iconButton}
          >
            <Bell color="#666" size={26} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            style={styles.iconButton}
          >
            <Settings color="#666" size={26} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Right Sidebar Notification Panel (same behavior as HomeScreen) */}
      <Modal
        visible={sidePanelVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSidePanelVisible(false)}
      >
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setSidePanelVisible(false)}
          />
          <View style={styles.sidebarPanel}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>
                알림 센터 ({unreadCount})
              </Text>
              <TouchableOpacity onPress={() => setSidePanelVisible(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sidebarContent}>
              {/* 채팅 알림 */}
              {unreadMessages.map((msg) => (
                <TouchableOpacity
                  key={`chat-${msg.messageId}`}
                  style={styles.notifItem}
                  onPress={() => {
                    setSidePanelVisible(false);
                    markAsRead(msg.roomId);
                    router.push({ pathname: '/chat-room', params: { roomId: msg.roomId } } as any);
                  }}
                >
                  <Text style={styles.notifType}>
                    채팅 신규메시지 ({msg.senderName})
                  </Text>
                  <Text style={styles.notifTitle}>관리자: {msg.content}</Text>
                  <Text style={styles.notifTime}>
                    {new Date(msg.sentAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* 기타 알림 */}
              {nonChatNotifs.map((notif: any) => (
                <TouchableOpacity
                  key={notif.id}
                  style={styles.notifItem}
                  onPress={() => {
                    setSidePanelVisible(false);
                    removeNotification(notif.id);
                    if (notif.target) {
                      router.push(notif.target as any);
                    }
                  }}
                >
                  <Text style={styles.notifType}>{notif.type}</Text>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifTime}>{notif.time}</Text>
                </TouchableOpacity>
              ))}

              {nonChatNotifs.length === 0 && unreadMessages.length === 0 && (
                <Text style={styles.emptyText}>새로운 알림이 없습니다.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#E53E3E',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  bellBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Sidebar styles (copied from HomeScreen for consistency)
  sidebarOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebarPanel: {
    width: '75%',
    backgroundColor: '#FCF9F2',
    height: '100%',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.brandInk,
  },
  sidebarContent: {
    padding: 15,
  },
  notifItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  notifType: {
    fontSize: 12,
    color: Colors.brandInk,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 15,
    color: '#333',
    marginBottom: 2,
  },
  notifTime: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    padding: 16,
  },
});

