import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Flame } from 'lucide-react-native';
import React, { useMemo, useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat } from '../context/ChatContext';
import { SegmentedTabs } from '@/src/components/molecules/SegmentedTabs';
import { NotificationTopBar } from '@/src/components/organisms/NotificationTopBar';

export default function ChatScreen({ navigation }: any) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { chatRooms } = useChat();
    const [selectedTabIndex, setSelectedTabIndex] = useState(0);

    const tabs = ['전체 메시지', '안읽은 메시지'];
    const selectedTab = tabs[selectedTabIndex];

    const filteredRooms = useMemo(() => {
        if (selectedTab === '안읽은 메시지') {
            return chatRooms.filter(room => room.unreadCount > 0);
        }
        return chatRooms;
    }, [chatRooms, selectedTab]);

    const renderRoom = useCallback(({ item: room }: { item: typeof chatRooms[0] }) => (
        <TouchableOpacity
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
    ), [router]);

    const keyExtractor = useCallback((item: typeof chatRooms[0]) => item.roomId, []);

    const emptyComponent = useMemo(() => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
                {selectedTab === '안읽은 메시지' ? '안읽은 메시지가 없습니다.' : '참여 중인 채팅방이 없습니다.'}
            </Text>
        </View>
    ), [selectedTab]);

    return (
        <View style={styles.container}>
            <NotificationTopBar title="채팅" />

            {/* Top Tabs (Segmented) */}
            <SegmentedTabs
                tabs={tabs}
                activeIndex={selectedTabIndex}
                onChange={setSelectedTabIndex}
            />

            <View style={styles.contentContainer}>
                <FlatList
                    data={filteredRooms}
                    renderItem={renderRoom}
                    keyExtractor={keyExtractor}
                    ListEmptyComponent={emptyComponent}
                    contentContainerStyle={filteredRooms.length === 0 ? { flex: 1, paddingBottom: insets.bottom + 84 } : { paddingBottom: insets.bottom + 84 }}
                    removeClippedSubviews
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
    tabContainer: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    tabButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, backgroundColor: '#f0f0f0' },
    activeTabButton: { backgroundColor: '#F3C742', borderTopRightRadius: 0 },
    tabText: { fontSize: 13, color: '#666', fontWeight: '500' },
    activeTabText: { color: Colors.brandInk, fontWeight: 'bold' },
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

