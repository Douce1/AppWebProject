import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Flame, CheckCircle2 } from 'lucide-react-native';
import { useSchedule } from '../context/ScheduleContext';

export default function ChatScreen() {
    const [selectedTab, setSelectedTab] = useState('요청/제안');
    const { addClass } = useSchedule();
    const [isAccepted, setIsAccepted] = useState(false);

    const tabs = ['받은 요청 전체', '안 읽은 채팅', '요청/제안'];

    const handleAccept = () => {
        addClass({
            id: Date.now().toString(),
            title: '신규 강의 (수락됨)',
            date: new Date().toISOString().split('T')[0], // Today
            location: '강남본원',
            time: '18:00 - 20:00'
        });
        setIsAccepted(true);
        Alert.alert('수락 완료', '일정에 자동 등록되었습니다.');
    };

    const renderMockRequest = () => (
        <View style={styles.requestCard}>
            <View style={styles.headerRow}>
                <View style={styles.badgeRow}>
                    <Text style={styles.dDayBadge}>D-1</Text>
                    <Flame color="#E53E3E" size={16} style={{ marginLeft: 5 }} />
                </View>
                <Text style={styles.timeText}>방금 전</Text>
            </View>
            <Text style={styles.requestTitle}>신규 강의 제안이 도착했습니다.</Text>
            <Text style={styles.previewText}>[오늘 예정], [강남본원], [50,000원/시간]</Text>

            <TouchableOpacity
                style={[styles.acceptButton, isAccepted && styles.acceptedButton]}
                onPress={handleAccept}
                disabled={isAccepted}
            >
                <CheckCircle2 color="white" size={16} style={{ marginRight: 5 }} />
                <Text style={styles.acceptText}>{isAccepted ? '수락됨 (일정 확인)' : '요청 수락하기'}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
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

            <ScrollView style={styles.contentContainer}>
                {selectedTab === '요청/제안' && (
                    <>
                        {renderMockRequest()}
                    </>
                )}
                {selectedTab !== '요청/제안' && (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>{selectedTab} 목록이 없습니다.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 50 },
    tabContainer: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    tabButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, backgroundColor: '#f0f0f0' },
    activeTabButton: { backgroundColor: '#3b82f6' },
    tabText: { fontSize: 13, color: '#666', fontWeight: '500' },
    activeTabText: { color: 'white', fontWeight: 'bold' },
    contentContainer: { padding: 15 },
    requestCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    badgeRow: { flexDirection: 'row', alignItems: 'center' },
    dDayBadge: { backgroundColor: '#FEE2E2', color: '#DC2626', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: 'bold' },
    timeText: { fontSize: 12, color: '#999' },
    requestTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
    previewText: { fontSize: 14, color: '#666', marginBottom: 15 },
    acceptButton: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8 },
    acceptedButton: { backgroundColor: '#9CA3AF' },
    acceptText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#999', fontSize: 15 }
});
