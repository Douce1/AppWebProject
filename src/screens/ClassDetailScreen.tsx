import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, CheckCircle2, Phone, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '../context/ScheduleContext';

export default function ClassDetailScreen() {
    const params = useLocalSearchParams();
    const classInfoString = typeof params.classInfo === 'string' ? params.classInfo : (Array.isArray(params.classInfo) ? params.classInfo[0] : null);
    const classInfo = classInfoString ? JSON.parse(classInfoString) : {};

    const { classes, departedIds, canArriveIds, arrivedIds, canEndClassIds, endedClassIds, readyToReportIds, reportedIds, handleClassAction, submitClassReport, getClassReport } = useSchedule();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const isReadyToReport = readyToReportIds.includes(classInfo.id);
    const isEndedClass = endedClassIds.includes(classInfo.id);
    const isCanEndClass = canEndClassIds.includes(classInfo.id);
    const isArrived = arrivedIds.includes(classInfo.id);
    const isCanArrive = canArriveIds.includes(classInfo.id);
    const isDeparted = departedIds.includes(classInfo.id);
    const isReported = reportedIds.includes(classInfo.id);

    // Modal state for Report
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportText, setReportText] = useState('');

    // Time logic for "강의 보고서 작성"
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Extract end time from "HH:MM - HH:MM"
    let hasEnded = false;
    if (classInfo.time && classInfo.date) {
        const endStr = classInfo.time.split('-')[1]?.trim();
        if (endStr && classInfo.date === todayStr) {
            const [endHour, endMin] = endStr.split(':').map(Number);
            const endTime = new Date(now);
            endTime.setHours(endHour, endMin, 0, 0);

            if (now > endTime) {
                hasEnded = true;
            }
        } else if (classInfo.date < todayStr) {
            hasEnded = true;
        }
    }

    const submitReport = () => {
        if (!reportText.trim()) {
            Alert.alert('알림', '강의 보고서 내용을 입력해주세요.');
            return;
        }
        submitClassReport(classInfo.id, reportText);
        setReportModalVisible(false);
        setReportText('');
        Alert.alert('보고서 작성 완료', '강의 보고서 작성이 완료되었습니다.');
        router.back();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>강의 정보</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.classTitle}>{classInfo.title}</Text>

                    <View style={styles.infoRow}>
                        <User size={20} color="#666" />
                        <Text style={styles.infoText}>김철수 (고등학교 2학년)</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Phone size={20} color="#666" />
                        <Text style={styles.infoText}>학부모: 010-1234-5678</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <BookOpen size={20} color="#666" />
                        <Text style={styles.infoText}>진도: 미적분 기초 응용반</Text>
                    </View>

                    <View style={styles.statusBox}>
                        <Text style={styles.statusLabel}>수업 상태</Text>
                        <Text style={[styles.statusValue, (isDeparted || isReported) && styles.statusValueActive]}>
                            {isReported ? '보고 완료' :
                                isReadyToReport ? '보고서 작성 대기' :
                                    isEndedClass ? '종료 처리 중' :
                                        isCanEndClass ? '강의 종료 대기' :
                                            isArrived ? '도착 완료 (강의 중)' :
                                                isCanArrive ? '도착 대기' :
                                                    isDeparted ? '이동 중' : '진행 예정'}
                        </Text>
                    </View>
                </View>

                {/* 보고서 뷰어 */}
                {isReported && getClassReport(classInfo.id) && (
                    <View style={styles.reportCard}>
                        <View style={styles.reportCardHeader}>
                            <CheckCircle2 size={18} color="#10B981" />
                            <Text style={styles.reportCardTitle}>작성된 강의 보고서</Text>
                        </View>
                        <Text style={styles.reportCardText}>{getClassReport(classInfo.id)}</Text>
                    </View>
                )}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <TouchableOpacity
                    style={[
                        styles.checkInButton,
                        (isDeparted && !isCanArrive) && styles.checkedInButton,
                        (isCanArrive && !isArrived) && styles.checkInButton,
                        (isArrived && !isCanEndClass) && styles.checkedInButton,
                        (isCanEndClass && !isEndedClass) && styles.checkInButton,
                        (isEndedClass && !isReadyToReport) && styles.checkedInButton,
                        (isReadyToReport && !isReported) && styles.reportButtonStyles,
                        (isReported) && styles.doneButtonStyles
                    ]}
                    onPress={() => {
                        if (isReadyToReport && !isReported) {
                            setReportModalVisible(true);
                        } else {
                            handleClassAction(classInfo.id);
                        }
                    }}
                    activeOpacity={0.7}
                    disabled={isReported || (isDeparted && !isCanArrive) || (isArrived && !isCanEndClass) || (isEndedClass && !isReadyToReport)}
                >
                    {isReported ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <CheckCircle2 color="white" size={20} style={{ marginRight: 8 }} />
                            <Text style={styles.actionText}>강의 수고하셨습니다!</Text>
                        </View>
                    ) : isReadyToReport ? (
                        <Text style={styles.actionText}>강의 보고서 작성</Text>
                    ) : isEndedClass ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <CheckCircle2 color="white" size={20} style={{ marginRight: 8 }} />
                            <Text style={styles.actionText}>종료 처리 중...</Text>
                        </View>
                    ) : isCanEndClass ? (
                        <Text style={styles.actionText}>강의 종료</Text>
                    ) : isArrived ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <CheckCircle2 color="white" size={20} style={{ marginRight: 8 }} />
                            <Text style={styles.actionText}>도착 완료 (강의 중)</Text>
                        </View>
                    ) : isCanArrive ? (
                        <Text style={styles.actionText}>도착</Text>
                    ) : isDeparted ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <CheckCircle2 color="white" size={20} style={{ marginRight: 8 }} />
                            <Text style={styles.actionText}>이동 중...</Text>
                        </View>
                    ) : (
                        <Text style={styles.actionText}>출발</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Report Modal */}
            <Modal
                visible={reportModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>강의 보고서 작성</Text>
                        <TextInput
                            style={styles.reasonInput}
                            placeholder="오늘의 강의 내용 및 특이사항을 작성해주세요"
                            value={reportText}
                            onChangeText={setReportText}
                            multiline={true}
                            textAlignVertical="top"
                        />
                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setReportModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitReportButton} onPress={submitReport}>
                                <Text style={styles.submitReportText}>작성 완료</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    content: { padding: 20, flex: 1 },
    card: { backgroundColor: 'white', borderRadius: 16, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    classTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 25 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    infoText: { fontSize: 16, color: '#4B5563', marginLeft: 12 },
    statusBox: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusLabel: { fontSize: 16, color: '#666', fontWeight: '500' },
    statusValue: { fontSize: 16, fontWeight: 'bold', color: '#6B7280' },
    statusValueActive: { color: '#10B981' },
    footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
    checkInButton: { backgroundColor: '#3b82f6', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
    checkedInButton: { backgroundColor: '#10B981', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
    reportButtonStyles: { backgroundColor: '#E53E3E', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
    doneButtonStyles: { backgroundColor: '#9CA3AF', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
    reportButton: { backgroundColor: '#E53E3E', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
    disabledButton: { backgroundColor: '#10B981', paddingVertical: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    actionText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 20, width: '85%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
    reasonInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, height: 120, padding: 12, fontSize: 14 },
    modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 },
    cancelButton: { paddingVertical: 10, paddingHorizontal: 15, marginRight: 10 },
    cancelButtonText: { color: '#666', fontWeight: '600' },
    submitReportButton: { backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
    submitReportText: { color: 'white', fontWeight: 'bold' },

    // Report viewer card
    reportCard: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#BBF7D0' },
    reportCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    reportCardTitle: { fontSize: 15, fontWeight: '700', color: '#065F46', marginLeft: 8 },
    reportCardText: { fontSize: 14, color: '#1F2937', lineHeight: 22 },
});
