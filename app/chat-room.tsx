import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard, Animated } from 'react-native';
import { ChevronLeft, Flame } from 'lucide-react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSchedule } from '../src/context/ScheduleContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatRoomScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const roomId = typeof params.roomId === 'string' ? params.roomId : (Array.isArray(params.roomId) ? params.roomId[0] : '');
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef<ScrollView>(null);

    const { chatMessages, addChatMessage, markChatRoomAsRead, isProposalResolved, proposalStatus, resolveProposal } = useSchedule();
    const [inputText, setInputText] = useState('');
    const keyboardPadding = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (roomId) {
            markChatRoomAsRead(roomId);
        }
    }, [roomId, chatMessages]);

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

    const roomMessages = chatMessages.filter(msg => msg.roomId === roomId);
    const companyName = roomMessages.length > 0 ? roomMessages[0].companyName : '채팅';

    const handleSend = () => {
        if (inputText.trim()) {
            addChatMessage({
                id: Date.now().toString(),
                roomId: roomId,
                companyName: companyName,
                text: inputText,
                isMine: true,
                time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            });
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
                                    style={styles.proposalRejectBtn}
                                    onPress={() => router.push({ pathname: '/(tabs)/docs', params: { targetTab: '요청/제안' } } as any)}
                                >
                                    <Text style={styles.proposalRejectText}>상세보기</Text>
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
                        <View key={msg.id} style={[
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

                            <View style={[styles.chatBubble, msg.isMine ? styles.myBubble : styles.theirBubble]}>
                                <Text style={[styles.chatText, msg.isMine && styles.myChatText]}>{msg.text}</Text>
                            </View>
                            <Text style={styles.chatTime}>{msg.time}</Text>
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

    chatBubble: { maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    theirBubble: { backgroundColor: 'white', borderTopLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
    myBubble: { backgroundColor: '#3b82f6', borderTopRightRadius: 4 },
    chatText: { fontSize: 15, color: '#111827', lineHeight: 22 },
    myChatText: { color: 'white' },
    chatTime: { fontSize: 11, color: '#9CA3AF', marginHorizontal: 8, marginBottom: 4 },

    inputContainer: { backgroundColor: 'white', paddingHorizontal: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 120 },
    chatInput: { flex: 1, fontSize: 15, color: '#111827', paddingTop: 8, paddingBottom: 8, maxHeight: 100 },
    sendButton: { backgroundColor: '#3b82f6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginLeft: 10, marginBottom: 2, justifyContent: 'center', alignItems: 'center' },
    sendButtonDisabled: { backgroundColor: '#9CA3AF' },
    sendButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

    // Proposal Banner
    proposalBanner: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 14, padding: 15, marginBottom: 20 },
    proposalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    proposalBadgeRow: { flexDirection: 'row', alignItems: 'center' },
    proposalDDay: { backgroundColor: '#FEE2E2', color: '#DC2626', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
    proposalHeaderTime: { fontSize: 11, color: '#9CA3AF' },
    proposalTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
    proposalDesc: { fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 18 },
    proposalActions: { flexDirection: 'row', gap: 10 },
    proposalAcceptBtn: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    proposalAcceptText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    proposalRejectBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    proposalRejectText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
    proposalResolved: { backgroundColor: '#F3F4F6', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    proposalResolvedText: { color: '#6B7280', fontWeight: 'bold', fontSize: 14 },
});
