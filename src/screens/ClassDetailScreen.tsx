import { Colors, Radius, Shadows } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, CheckCircle2, Phone, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '../context/ScheduleContext';
import { apiClient } from '../api/apiClient';
import { API_BASE_URL } from '../api/httpClient';
import { getAccessToken } from '../store/authStore';

export default function ClassDetailScreen() {
    const params = useLocalSearchParams();
    const classInfoString = typeof params.classInfo === 'string' ? params.classInfo : (Array.isArray(params.classInfo) ? params.classInfo[0] : null);
    const classInfo = classInfoString ? JSON.parse(classInfoString) : {};
    const requestIdParam = typeof params.requestId === 'string'
        ? params.requestId
        : (Array.isArray(params.requestId) ? params.requestId[0] : undefined);

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
    const [reportSubmitting, setReportSubmitting] = useState(false);

    // Modal state for Request Rejection
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Lesson request 상태 (이 화면에서만 로컬로 추적)
    const [requestStatus, setRequestStatus] = useState<'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | null>(
        requestIdParam ? 'PENDING' : null,
    );
    const [requestLoading, setRequestLoading] = useState(false);

    // Time logic for "강의 보고서 작성"
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    let hasEnded = false;
    let isDepartable = false;
    const timeParts = classInfo.time ? classInfo.time.split('-') : [];
    
    if (timeParts.length === 2 && classInfo.date) {
        const startStr = timeParts[0].trim();
        const endStr = timeParts[1].trim();
        
        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);
        
        const classStart = new Date(now);
        classStart.setHours(startH, startM, 0, 0);
        
        const classEnd = new Date(now);
        classEnd.setHours(endH, endM, 0, 0);

        if (classInfo.date === todayStr) {
            if (now > classEnd) hasEnded = true;
            
            // Allow departing 2 hours before class until the class end
            const validStart = new Date(classStart.getTime() - 2 * 60 * 60 * 1000);
            if (now >= validStart && now <= classEnd) {
                isDepartable = true;
            }
        } else if (classInfo.date < todayStr) {
            hasEnded = true;
        }
    }

    const submitReport = async () => {
        if (!reportText.trim()) {
            Alert.alert('알림', '강의 보고서 내용을 입력해주세요.');
            return;
        }
        setReportSubmitting(true);
        try {
            await submitClassReport(classInfo.id, reportText);
            setReportModalVisible(false);
            setReportText('');
            Alert.alert('보고서 작성 완료', '강의 보고서가 서버에 저장되었습니다.');
            router.back();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '보고서 저장에 실패했습니다.';
            Alert.alert('저장 실패', message, [
                { text: '취소', style: 'cancel' },
                { text: '다시 시도', onPress: () => { void submitReport(); } },
            ]);
        } finally {
            setReportSubmitting(false);
        }
    };

    const handleAcceptRequest = async () => {
        if (!requestIdParam || requestStatus && requestStatus !== 'PENDING') return;
        setRequestLoading(true);
        try {
            const updated = await apiClient.respondToRequest(requestIdParam, { action: 'ACCEPT' });
            setRequestStatus(updated.status);
            Alert.alert('요청 수락 완료', '수업 요청을 수락했습니다.');
        } catch (err: unknown) {
            const e = err as Error & { status?: number; message?: string };
            if (e.status === 409) {
                Alert.alert('요청 처리 실패', '이미 응답된 요청입니다.');
            } else {
                Alert.alert('요청 처리 실패', e.message ?? '요청을 처리하는 중 오류가 발생했습니다.');
            }
        } finally {
            setRequestLoading(false);
        }
    };

    const handleRejectRequest = async () => {
        if (!requestIdParam || requestStatus && requestStatus !== 'PENDING') return;
        const trimmed = rejectReason.trim();
        if (!trimmed) {
            Alert.alert('알림', '거절 사유를 입력해주세요.');
            return;
        }
        setRequestLoading(true);
        try {
            const updated = await apiClient.respondToRequest(requestIdParam, {
                action: 'REJECT',
                rejectionReason: trimmed,
            });
            setRequestStatus(updated.status);
            setRejectModalVisible(false);
            setRejectReason('');
            Alert.alert('요청 거절 완료', '수업 요청을 거절했습니다.');
        } catch (err: unknown) {
            const e = err as Error & { status?: number; message?: string };
            if (e.status === 409) {
                Alert.alert('요청 처리 실패', '이미 응답된 요청입니다.');
            } else {
                Alert.alert('요청 처리 실패', e.message ?? '요청을 처리하는 중 오류가 발생했습니다.');
            }
        } finally {
            setRequestLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50) }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>강의 정보</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.classTitle}>{classInfo.title}</Text>

                    {requestIdParam && requestStatus && requestStatus === 'PENDING' && (
                        <View style={styles.requestCard}>
                            <Text style={styles.requestTitle}>수업 제안 응답</Text>
                            <Text style={styles.requestDescription}>
                                이 수업 제안에 대해 수락 또는 거절을 선택해 주세요.
                            </Text>
                            <View style={styles.requestActions}>
                                <TouchableOpacity
                                    style={[styles.requestButton, styles.requestAcceptButton]}
                                    onPress={handleAcceptRequest}
                                    disabled={requestLoading}
                                >
                                    <Text style={styles.requestAcceptText}>
                                        {requestLoading ? '처리 중...' : '수락'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.requestButton, styles.requestRejectButton]}
                                    onPress={() => setRejectModalVisible(true)}
                                    disabled={requestLoading}
                                >
                                    <Text style={styles.requestRejectText}>거절</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

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
                        <Text style={styles.infoText}>진도: 미적분 기초 적용반</Text>
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

                    {classInfo.isExternal && classInfo.documentId && (
                            <TouchableOpacity 
                                style={styles.originalDocButton} 
                                onPress={async () => {
                                    try {
                                        const token = await getAccessToken();
                                        if (!token) {
                                            Alert.alert('오류', '로그인 정보가 없습니다.');
                                            return;
                                        }
                                        const url = `${API_BASE_URL}/documents/${classInfo.documentId}/file?token=${token}`;
                                        Linking.openURL(url);
                                    } catch (e) {
                                        Alert.alert('오류', '원본 문서 열람에 실패했습니다.');
                                    }
                                }}
                            >
                                <BookOpen size={18} color={Colors.brandInk} style={{ marginRight: 8 }} />
                                <Text style={styles.originalDocButtonText}>외부 원본 문서 보기</Text>
                            </TouchableOpacity>
                    )}
                </View>

                {/* 보고서 뷰어 */}
                {isReported && getClassReport(classInfo.id) && (
                    <View style={styles.reportCard}>
                        <View style={styles.reportCardHeader}>
                            <CheckCircle2 size={18} color="#10B981" />
                            <Text style={styles.reportCardTitle}>작성한 강의 보고서</Text>
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
                    disabled={isReported || (isDeparted && !isCanArrive) || (isArrived && !isCanEndClass) || (isEndedClass && !isReadyToReport) || (!isDeparted && !isArrived && !isEndedClass && !isReadyToReport && !isDepartable)}
                >
                    {isReported ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <CheckCircle2 color="white" size={20} style={{ marginRight: 8 }} />
                            <Text style={styles.actionText}>강의 수고하셨습니다</Text>
                        </View>
                    ) : isReadyToReport ? (
                        <Text style={[styles.actionText, { color: Colors.brandInk }]}>강의 보고서 작성</Text>
                    ) : isEndedClass ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <CheckCircle2 color="white" size={20} style={{ marginRight: 8 }} />
                            <Text style={styles.actionText}>종료 처리 중...</Text>
                        </View>
                    ) : isCanEndClass ? (
                        <Text style={[styles.actionText, { color: Colors.brandInk }]}>강의 종료</Text>
                    ) : isArrived ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <CheckCircle2 color="white" size={20} style={{ marginRight: 8 }} />
                            <Text style={styles.actionText}>도착 완료 (강의 중)</Text>
                        </View>
                    ) : isCanArrive ? (
                        <Text style={[styles.actionText, { color: Colors.brandInk }]}>도착 확인</Text>
                    ) : isDeparted ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <CheckCircle2 color="white" size={20} style={{ marginRight: 8 }} />
                            <Text style={styles.actionText}>이동 중...</Text>
                        </View>
                    ) : (
                        <Text style={[styles.actionText, { color: Colors.brandInk }]}>출발</Text>
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
                            <TouchableOpacity
                                style={styles.submitReportButton}
                                onPress={() => { void submitReport(); }}
                                disabled={reportSubmitting}
                            >
                                <Text style={styles.submitReportText}>
                                    {reportSubmitting ? '저장 중...' : '작성 완료'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Request Reject Modal */}
            <Modal
                visible={rejectModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setRejectModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>수업 요청 거절</Text>
                        <TextInput
                            style={styles.reasonInput}
                            placeholder="거절 사유를 입력해주세요"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline={true}
                            textAlignVertical="top"
                        />
                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setRejectModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.submitReportButton}
                                onPress={handleRejectRequest}
                                disabled={requestLoading}
                            >
                                <Text style={styles.submitReportText}>
                                    {requestLoading ? '처리 중...' : '거절 완료'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    content: { padding: 20, flex: 1 },
    card: { backgroundColor: 'white', borderRadius: 16, borderTopRightRadius: 0, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    classTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 25 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    infoText: { fontSize: 16, color: '#4B5563', marginLeft: 12 },
    statusBox: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusLabel: { fontSize: 16, color: '#666', fontWeight: '500' },
    statusValue: { fontSize: 16, fontWeight: 'bold', color: '#6B7280' },
    statusValueActive: { color: '#10B981' },
    originalDocButton: { marginTop: 15, backgroundColor: '#F0F9FF', paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BAE6FD' },
    originalDocButtonText: { fontSize: 14, fontWeight: 'bold', color: Colors.brandInk },
    footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
    checkInButton: { backgroundColor: '#FFF0C2', paddingVertical: 15, ...Radius.button, alignItems: 'center' },
    checkedInButton: { backgroundColor: Colors.brandInk, opacity: 0.6, paddingVertical: 15, ...Radius.button, alignItems: 'center' },
    reportButtonStyles: { backgroundColor: Colors.brandHoney, paddingVertical: 15, ...Radius.button, alignItems: 'center' },
    doneButtonStyles: { backgroundColor: Colors.brandInk, opacity: 0.6, paddingVertical: 15, ...Radius.button, alignItems: 'center' },
    reportButton: { backgroundColor: Colors.brandHoney, paddingVertical: 15, ...Radius.button, alignItems: 'center' },
    disabledButton: { backgroundColor: Colors.brandInk, opacity: 0.6, paddingVertical: 15, ...Radius.button, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    actionText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 20, width: '85%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
    reasonInput: { backgroundColor: Colors.surfaceSoft, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, height: 120, padding: 12, fontSize: 14 },
    modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 },
    cancelButton: { paddingVertical: 10, paddingHorizontal: 15, marginRight: 10 },
    cancelButtonText: { color: '#666', fontWeight: '600' },
    submitReportButton: { backgroundColor: Colors.brandInk, paddingVertical: 10, paddingHorizontal: 15, ...Radius.button },
    submitReportText: { color: Colors.brandHoney, fontWeight: 'bold' },

    // Report viewer card
    reportCard: { backgroundColor: '#F0FDF4', borderRadius: 12, borderTopRightRadius: 0, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#BBF7D0' },
    reportCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    reportCardTitle: { fontSize: 15, fontWeight: '700', color: '#065F46', marginLeft: 8 },
    reportCardText: { fontSize: 14, color: '#1F2937', lineHeight: 22 },
    // Request card
    requestCard: {
        marginTop: 16,
        marginBottom: 8,
        padding: 16,
        borderRadius: 12,
        borderTopRightRadius: 0,
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    requestTitle: { fontSize: 15, fontWeight: '700', color: '#1D4ED8', marginBottom: 6 },
    requestDescription: { fontSize: 13, color: '#374151', marginBottom: 12 },
    requestActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    requestButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 },
    requestAcceptButton: { backgroundColor: Colors.brandInk },
    requestRejectButton: { backgroundColor: 'white', borderWidth: 1, borderColor: '#DC2626' },
    requestAcceptText: { color: 'white', fontSize: 14, fontWeight: '700' },
    requestRejectText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },
});
