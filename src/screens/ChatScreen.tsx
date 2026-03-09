import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Flame, Settings } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useChat } from '../context/ChatContext';
import { SegmentedTabs } from '@/src/components/molecules/SegmentedTabs';

export default function ChatScreen({ navigation }: any) {
    const router = useRouter();
    const { chatRooms } = useChat();
    const [selectedTabIndex, setSelectedTabIndex] = useState(0);

    const tabs = ['전체 메시지', '안읽은 메시지'];
    const selectedTab = tabs[selectedTabIndex];

    // Filter rooms based on selected tab
    const getFilteredRooms = () => {
        if (selectedTab === '안읽은 메시지') {
            return chatRooms.filter(room => room.unreadCount > 0);
        }
        return chatRooms;
    };

    const renderChatRooms = () => {
        const rooms = getFilteredRooms();

        if (rooms.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        {selectedTab === '안읽은 메시지' ? '안읽은 메시지가 없습니다.' : '참여 중인 채팅방이 없습니다.'}
                    </Text>
                </View>
            );
        }

        return (
            <ScrollView style={styles.chatScroll} contentContainerStyle={{ paddingBottom: 20 }}>
                {rooms.map(room => (
                    <TouchableOpacity
                        key={room.roomId}
                        style={styles.roomItem}
                        onPress={() => router.push({ pathname: '/chat-room', params: { roomId: room.roomId } } as any)}
                    >
                        <View style={styles.roomProfilePic}>
                            <Flame color="#9CA3AF" size={24} />
                        </View>
                        <View style={styles.roomInfo}>
                            <View style={styles.roomHeaderRow}>
                                <Text style={styles.roomName}>{room.title ?? '주제 없음'}</Text>
                                <Text style={styles.roomTime}>{new Date(room.lastMessage?.sentAt ?? room.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>
                            <View style={styles.roomMessageRow}>
                                <Text style={styles.roomLatestMessage} numberOfLines={1}>{room.lastMessage?.content ?? ''}</Text>
                                {room.unreadCount > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadText}>{room.unreadCount}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            {/* Top Bar with Settings */}
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>채팅</Text>
                <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.settingsIconContainer}>
                    <Settings color="#666" size={26} />
                </TouchableOpacity>
            </View>

            {/* Top Tabs (Segmented) */}
            <SegmentedTabs
                tabs={tabs}
                activeIndex={selectedTabIndex}
                onChange={setSelectedTabIndex}
            />

            <View style={styles.contentContainer}>
                {renderChatRooms()}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 10 },
    topBarTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    settingsIconContainer: { padding: 8 },
    tabContainer: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    tabButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, backgroundColor: '#f0f0f0' },
    activeTabButton: { backgroundColor: Colors.brandInk },
    tabText: { fontSize: 13, color: '#666', fontWeight: '500' },
    activeTabText: { color: 'white', fontWeight: 'bold' },
    contentContainer: { flex: 1, padding: 15 },
    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#999', fontSize: 15 },

    // Room List Styles
    chatScroll: { flex: 1 },
    roomItem: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10 },
    roomProfilePic: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.brandCream, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    roomInfo: { flex: 1, justifyContent: 'center' },
    roomHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    roomName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    roomTime: { fontSize: 12, color: '#9CA3AF' },
    roomMessageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    roomLatestMessage: { fontSize: 14, color: '#6B7280', flex: 1, paddingRight: 10 },
    unreadBadge: { backgroundColor: '#E53E3E', borderRadius: 12, minWidth: 24, paddingHorizontal: 6, paddingVertical: 2, justifyContent: 'center', alignItems: 'center' },
    unreadText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});

