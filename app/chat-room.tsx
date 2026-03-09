import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Flame } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat } from '../src/context/ChatContext';
import { useSchedule } from '../src/context/ScheduleContext';
import { Colors, Radius, Shadows } from '@/constants/theme';

export default function ChatRoomScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const roomId = typeof params.roomId === 'string' ? params.roomId : (Array.isArray(params.roomId) ? params.roomId[0] : '');
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef<ScrollView>(null);

    const { isProposalResolved, proposalStatus, resolveProposal } = useSchedule();
    const { getMessages, sendMessage, markAsRead, chatRooms } = useChat();
    const [inputText, setInputText] = useState('');
    const keyboardPadding = useRef(new Animated.Value(0)).current;

    const roomMessages = getMessages(roomId);
    const companyName = chatRooms.find(r => r.roomId === roomId)?.title ?? '채팅';

    useEffect(() => {
        if (roomId) {
            markAsRead(roomId);
        }
    }, [roomId, roomMessages]);

    // Android keyboard handling via Keyboard API
    useEffect(() => {
        if (Platform.OS !== 'android') return;

        const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
            Animated.timing(keyboardPadding, {
                toValue: e.endCoordinates.height,
                duration: 200,
                useNativeDriver: false,
            }).start();
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        });

        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            Animated.timing(keyboardPadding, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start();
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);



    const handleSend = () => {
        if (inputText.trim()) {
            sendMessage(roomId, inputText);
            setInputText('');
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    const renderContent = () => (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ChevronLeft size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{companyName}</Text>
                <View style={styles.headerRight} />
            </View>

            {/* Chat Messages */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.chatScroll}
                contentContainerStyle={styles.chatScrollContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                keyboardShouldPersistTaps="handled"
            >
                {/* Proposal Banner for 강남본원 회화 (room-1) */}
                {roomId === 'room-1' && (
                    <View style={styles.proposalBanner}>
                        <View style={styles.proposalHeader}>
                            <View style={styles.proposalBadgeRow}>
                                <Text style={styles.proposalDDay}>D-1</Text>
                                <Flame color="#E53E3E" size={14} style={{ marginLeft: 4 }} />
                            </View>
                            <Text style={styles.proposalHeaderTime}>방금 전</Text>
                        </View>
                        <Text style={styles.proposalTitle}>📋 강남본원 회화 신규 강의 배정 제안</Text>
                        <Text style={styles.proposalDesc}>고3 EBS 파이널 문풀 · 강남본원 3관 302호 · 18:00-20:00</Text>
                        {!isProposalResolved ? (
                            <View style={styles.proposalActions}>
                                <TouchableOpacity
                                    style={styles.proposalAcceptBtn}
                                    onPress={() => resolveProposal('수락')}
                                >
                                    <Text style={styles.proposalAcceptText}>수락</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.proposalViewBtn}
                                    onPress={() => router.push({ pathname: '/(tabs)/docs', params: { targetTab: '요청/제안' } } as any)}
                                >
                                    <Text style={styles.proposalViewText}>상세보기</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.proposalResolved}>
                                <Text style={styles.proposalResolvedText}>
                                    {proposalStatus === '수락' ? '✅ 수락 완료' : '❌ 거절 완료'}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {roomMessages.map((msg, index) => {
                    const showProfile = !msg.isMine && (index === 0 || roomMessages[index - 1].isMine);
                    return (
                        <View key={msg.messageId} style={[
                            styles.messageRow,
                            msg.isMine ? styles.myMessageRow : styles.theirMessageRow,
                            { marginTop: showProfile ? 15 : 4 }
                        ]}>
                            {showProfile && (
                                <View style={styles.profileCircle}>
                                    <Text style={styles.profileCircleText}>{companyName.substring(0, 1)}</Text>
                                </View>
                            )}
                            {!showProfile && !msg.isMine && <View style={styles.profilePlaceholder} />}

                            {msg.isMine && <Text style={styles.chatTime}>{new Date(msg.sentAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</Text>}
                            <View style={[styles.chatBubble, msg.isMine ? styles.myBubble : styles.theirBubble]}>
                                <Text style={[styles.chatText, msg.isMine && styles.myChatText]}>{msg.content}</Text>
                            </View>
                            {!msg.isMine && <Text style={styles.chatTime}>{new Date(msg.sentAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</Text>}
                        </View>
                    );
                })}
            </ScrollView>

            {/* Input Area */}
            <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10), marginBottom: 5 }]}>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.chatInput}
                        placeholder="메시지를 입력하세요..."
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                    >
                        <Text style={styles.sendButtonText}>전송</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );

    // iOS: Use KeyboardAvoidingView with behavior='padding'
    if (Platform.OS === 'ios') {
        return (
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: '#f2f5f9' }}
                behavior="padding"
                keyboardVerticalOffset={0}
            >
                <View style={[styles.container, { paddingTop: insets.top }]}>
                    {renderContent()}
                </View>
            </KeyboardAvoidingView>
        );
    }

    // Android: Use Animated.View with manual keyboard padding
    return (
        <Animated.View style={{ flex: 1, backgroundColor: '#f2f5f9', paddingTop: insets.top, paddingBottom: keyboardPadding }}>
            {renderContent()}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f2f5f9' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    headerRight: { width: 38 },

    chatScroll: { flex: 1 },
    chatScrollContent: { padding: 15, paddingBottom: 20 },
    messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2, maxWidth: '100%' },
    myMessageRow: { justifyContent: 'flex-end' },
    theirMessageRow: { justifyContent: 'flex-start' },
    profileCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginRight: 8, alignSelf: 'flex-start' },
    profileCircleText: { fontSize: 14, fontWeight: 'bold', color: '#6B7280' },
    profilePlaceholder: { width: 36, marginRight: 8 },

    chatBubble: { maxWidth: '65%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    theirBubble: { backgroundColor: 'white', borderTopLeftRadius: 4, ...Shadows.card },
    myBubble: { backgroundColor: Colors.brandInk, borderTopRightRadius: 4 },
    chatText: { fontSize: 15, color: '#111827', lineHeight: 22 },
    myChatText: { color: Colors.brandCream },
    chatTime: { fontSize: 11, color: '#9CA3AF', marginHorizontal: 4, marginBottom: 4, flexShrink: 0 },

    inputContainer: { backgroundColor: 'white', paddingHorizontal: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.surfaceSoft, borderRadius: 24, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 120 },
    chatInput: { flex: 1, fontSize: 15, color: '#111827', paddingTop: 8, paddingBottom: 8, maxHeight: 100 },
    sendButton: { backgroundColor: Colors.brandInk, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginLeft: 10, marginBottom: 2, justifyContent: 'center', alignItems: 'center' },
    sendButtonDisabled: { backgroundColor: Colors.border },
    sendButtonText: { color: Colors.brandHoney, fontWeight: 'bold', fontSize: 14 },

    // Proposal Banner
    proposalBanner: { backgroundColor: Colors.brandCream, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 15, marginBottom: 20 },
    proposalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    proposalBadgeRow: { flexDirection: 'row', alignItems: 'center' },
    proposalDDay: { backgroundColor: '#FEE2E2', color: '#DC2626', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
    proposalHeaderTime: { fontSize: 11, color: '#9CA3AF' },
    proposalTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
    proposalDesc: { fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 18 },
    proposalActions: { flexDirection: 'row', gap: 10 },
    proposalAcceptBtn: { flex: 1, backgroundColor: '#F3C742', paddingVertical: 10, ...Radius.button, alignItems: 'center' },
    proposalAcceptText: { color: Colors.brandInk, fontWeight: 'bold', fontSize: 14 },
    proposalViewBtn: { flex: 1, backgroundColor: '#FFF0C2', paddingVertical: 10, ...Radius.button, alignItems: 'center' },
    proposalViewText: { color: '#251B10', fontWeight: 'bold', fontSize: 14 },
    proposalRejectBtn: { flex: 1, backgroundColor: '#F2B8B5', paddingVertical: 10, ...Radius.button, alignItems: 'center' },
    proposalRejectText: { color: '#B42318', fontWeight: '600', fontSize: 14 },
    proposalResolved: { backgroundColor: '#FFF0C2', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    proposalResolvedText: { color: '#251B10', fontWeight: 'bold', fontSize: 14 },
});
