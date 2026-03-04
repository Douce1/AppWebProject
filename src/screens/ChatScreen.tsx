import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Flame } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSchedule } from '../context/ScheduleContext';

export default function ChatScreen({ navigation }: any) {
    const router = useRouter();
    const { isProposalResolved } = useSchedule();
    const [selectedTab, setSelectedTab] = useState('관리자 채팅');

    // Chat state
    const [chatMessages, setChatMessages] = useState([
        { id: '1', text: '네 알겠습니다. 수고하세요.', isMine: false, time: '10:00 AM' }
    ]);
    const [inputText, setInputText] = useState('');

    const tabs = ['받은 요청 전체', '관리자 채팅'];

    const renderChatTab = () => (
        <View style={styles.chatTabContainer}>
            <ScrollView style={styles.chatScroll} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* System notification pointing to DocsScreen */}
                {!isProposalResolved && (
                    <TouchableOpacity
                        style={styles.systemBubble}
                        onPress={() => {
                            router.push({
                                pathname: '/(tabs)/docs',
                                params: { targetTab: '요청/제안' }
                            });
                        }}
                    >
                        <View style={styles.systemBubbleHeader}>
                            <View style={styles.badgeRow}>
                                <Text style={styles.dDayBadge}>D-1</Text>
                                <Flame color="#E53E3E" size={14} style={{ marginLeft: 5 }} />
                            </View>
                            <Text style={styles.systemTime}>방금 전</Text>
                        </View>
                        <Text style={styles.systemBubbleTitle}>강남본원 회화 신규 강의 배정 제안</Text>
                        <Text style={styles.systemBubbleAction}>탭하여 상세내용 확인 &gt;</Text>
                    </TouchableOpacity>
                )}

                {chatMessages.map(msg => (
                    <View key={msg.id} style={[styles.chatBubble, msg.isMine ? styles.myBubble : styles.theirBubble]}>
                        <Text style={[styles.chatText, msg.isMine && styles.myChatText]}>{msg.text}</Text>
                        <Text style={styles.chatTime}>{msg.time}</Text>
                    </View>
                ))}
            </ScrollView>
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.chatInput}
                    placeholder="메시지를 입력하세요..."
                    value={inputText}
                    onChangeText={setInputText}
                />
                <TouchableOpacity
                    style={styles.sendButton}
                    onPress={() => {
                        if (inputText.trim()) {
                            setChatMessages([...chatMessages, {
                                id: Date.now().toString(),
                                text: inputText,
                                isMine: true,
                                time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                            }]);
                            setInputText('');
                        }
                    }}
                >
                    <Text style={styles.sendButtonText}>전송</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
        >
            {/* Top Tabs */}
            <View style={styles.tabContainer}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabButton, selectedTab === tab && styles.activeTabButton]}
                        onPress={() => setSelectedTab(tab)}
                    >
                        <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.contentContainer}>
                {selectedTab === '관리자 채팅' && renderChatTab()}
                {selectedTab !== '관리자 채팅' && (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>{selectedTab} 목록이 없습니다.</Text>
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 50 },
    tabContainer: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    tabButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, backgroundColor: '#f0f0f0' },
    activeTabButton: { backgroundColor: '#3b82f6' },
    tabText: { fontSize: 13, color: '#666', fontWeight: '500' },
    activeTabText: { color: 'white', fontWeight: 'bold' },
    contentContainer: { flex: 1, padding: 15 },
    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#999', fontSize: 15 },

    // Chat Styles
    chatTabContainer: { flex: 1 },
    chatScroll: { flex: 1 },
    systemBubble: { backgroundColor: '#F3F4F6', padding: 15, borderRadius: 12, marginBottom: 15, alignSelf: 'center', width: '90%', borderWidth: 1, borderColor: '#E5E7EB' },
    systemBubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    systemBubbleTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
    systemBubbleAction: { fontSize: 13, color: '#3b82f6', fontWeight: 'bold' },
    badgeRow: { flexDirection: 'row', alignItems: 'center' },
    dDayBadge: { backgroundColor: '#FEE2E2', color: '#DC2626', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, fontSize: 11, fontWeight: 'bold' },
    systemTime: { fontSize: 11, color: '#9CA3AF' },
    chatBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 15 },
    theirBubble: { backgroundColor: 'white', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
    myBubble: { backgroundColor: '#3b82f6', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
    chatText: { fontSize: 14, color: '#333', lineHeight: 20 },
    myChatText: { color: 'white' },
    chatTime: { fontSize: 10, color: '#9CA3AF', marginTop: 6, alignSelf: 'flex-end' },
    inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 10, borderRadius: 25, marginTop: 10 },
    chatInput: { flex: 1, paddingHorizontal: 15, paddingVertical: 8, fontSize: 14, maxHeight: 100 },
    sendButton: { backgroundColor: '#3b82f6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginLeft: 10 },
    sendButtonText: { color: 'white', fontWeight: 'bold', fontSize: 13 }
});
