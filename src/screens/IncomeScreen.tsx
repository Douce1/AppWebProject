import { useRouter } from 'expo-router';
import { Bell, FileText, RefreshCcw, Settings, TrendingUp, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { Button } from '@/src/components/atoms/Button';
import { httpClient } from '@/src/api/httpClient';

export default function IncomeScreen() {
    const router = useRouter();
    const [selectedDetail, setSelectedDetail] = useState<any>(null);
    const [testMessage, setTestMessage] = useState<string | null>(null);
    const [testError, setTestError] = useState<string | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    const styles = useMemo(
        () =>
            StyleSheet.create({
                container: { flex: 1, backgroundColor: Colors.background },
                header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: Colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
                headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.brandInk },
                headerIcons: { flexDirection: 'row', alignItems: 'center' },
                settingsIconContainer: { padding: 8 },
                incomeCard: { backgroundColor: '#FFF0C2', margin: 15, borderRadius: 16, borderTopRightRadius: 0, padding: 20, shadowColor: '#FFF0C2', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
                incomeLabel: { color: Colors.brandInk, fontSize: 14, marginBottom: 4, fontWeight: '500' },
                amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 5 },
                amountText: { color: '#F3C742', fontSize: 32, fontWeight: 'bold' },
                currencyText: { color: Colors.brandInk, fontSize: 18, marginLeft: 4, fontWeight: '600' },
                taxDeductedText: { color: Colors.brandInk, fontSize: 14, marginBottom: 20, fontWeight: '500', opacity: 0.7 },
                statsRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 12, marginBottom: 15 },
                statBox: { flex: 1, alignItems: 'center' },
                statLabel: { color: Colors.brandInk, fontSize: 12, marginBottom: 4, opacity: 0.7 },
                statValue: { color: Colors.brandInk, fontSize: 16, fontWeight: 'bold' },
                verticalDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
                increaseBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(243, 199, 66, 0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
                increaseText: { color: Colors.brandInk, fontSize: 13, fontWeight: 'bold' },
                divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginVertical: 15 },
                paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                paymentText: { color: Colors.brandInk, fontSize: 14, opacity: 0.8 },
                historySection: { paddingHorizontal: 20, marginTop: 10, paddingBottom: 100 },
                sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.brandInk, marginBottom: 15 },
                historyItem: { backgroundColor: 'white', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, ...Shadows.card },
                historyIconBox: { backgroundColor: Colors.brandMint, padding: 10, borderRadius: 10, marginRight: 12 },
                historyTitle: { fontSize: 15, fontWeight: '600', color: Colors.brandInk, marginBottom: 4 },
                historyDate: { fontSize: 12, color: Colors.mutedForeground },
                historyAmount: { fontSize: 16, fontWeight: 'bold', color: Colors.brandInk },
                historyTaxAmount: { fontSize: 13, color: Colors.brandHoney, marginTop: 4, fontWeight: '500' },
                modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
                modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, minHeight: 400 },
                modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
                modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.brandInk },
                receiptBox: { backgroundColor: Colors.surfaceSoft, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 25 },
                receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
                receiptRowBorder: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: Colors.border, borderStyle: 'dashed' },
                receiptRowTotal: { marginTop: 15, paddingTop: 15, borderTopWidth: 2, borderTopColor: Colors.brandInk },
                receiptLabel: { color: Colors.mutedForeground, fontSize: 14 },
                receiptValue: { color: Colors.brandInk, fontSize: 14, fontWeight: '500' },
                receiptTotalLabel: { color: Colors.brandInk, fontSize: 16, fontWeight: 'bold' },
                receiptTotalValue: { color: Colors.brandHoney, fontSize: 18, fontWeight: 'bold' },
                emptyHistoryText: { fontSize: 14, fontWeight: '500', color: Colors.mutedForeground, marginTop: 8 },
            }),
        [],
    );

    const handleTestApiCall = async () => {
        setIsTesting(true);
        setTestError(null);
        try {
            const lessons = await httpClient.getLessons();
            setTestMessage(`백엔드 연결 성공 (수업 ${lessons.length}개)`);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : '요청 중 알 수 없는 오류가 발생했습니다.';
            setTestError(message);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>수입/정산</Text>
                <View style={styles.headerIcons}>
                    <TouchableOpacity
                        onPress={() => router.push('/' as any)}
                        style={styles.settingsIconContainer}
                    >
                        <Bell color={Colors.mutedForeground} size={26} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/settings' as any)}
                        style={styles.settingsIconContainer}
                    >
                        <Settings color={Colors.mutedForeground} size={26} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.incomeCard}>
                <Text style={styles.incomeLabel}>이번 달 예상 수입 (세전)</Text>
                <Text style={[styles.taxDeductedText, { marginTop: 8 }]}>
                    정산 데이터는 곧 백엔드 API와 연동될 예정입니다.
                </Text>

                <View style={styles.divider} />

                <View style={styles.paymentRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <RefreshCcw color={Colors.brandInk} size={14} style={{ marginRight: 6 }} />
                        <Text style={styles.paymentText}>지급 예정일: 11월 10일</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setSelectedDetail({ month: '10월', amount: 3450000, hours: 68 })}
                        style={{ paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#F3C742', borderRadius: 18 }}
                    >
                        <Text style={{ color: '#FFF0C2', fontWeight: 'bold', fontSize: 12.5 }}>상세보기 &gt;</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>정산 내역</Text>

                <View
                    style={{
                        marginBottom: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Text style={{ fontSize: 13, color: Colors.mutedForeground }}>
                        백엔드 /lessons API 연결 테스트
                    </Text>
                    <TouchableOpacity
                        onPress={handleTestApiCall}
                        disabled={isTesting}
                        style={{
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: 14,
                            backgroundColor: Colors.brandMint,
                            opacity: isTesting ? 0.6 : 1,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight: '600',
                                color: Colors.brandInk,
                            }}
                        >
                            {isTesting ? '요청 중...' : '테스트 호출'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {testMessage && (
                    <Text
                        style={{
                            fontSize: 12,
                            color: Colors.brandMint,
                            marginBottom: 8,
                        }}
                    >
                        {testMessage}
                    </Text>
                )}
                {testError && (
                    <Text
                        style={{
                            fontSize: 12,
                            color: 'red',
                            marginBottom: 8,
                        }}
                    >
                        {testError}
                    </Text>
                )}

                <Text style={[styles.sectionTitle, styles.emptyHistoryText]}>
                    정산 내역은 아직 API에 연결되지 않았습니다.
                </Text>
            </View>

            {/* Detail Modal */}
            <Modal
                visible={!!selectedDetail}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedDetail(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedDetail?.month} 정산 상세 내역</Text>
                            <TouchableOpacity onPress={() => setSelectedDetail(null)}>
                                <X size={24} color={Colors.brandInk} />
                            </TouchableOpacity>
                        </View>

                        {selectedDetail && (
                            <View style={styles.receiptBox}>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>총 근무 시간</Text>
                                    <Text style={styles.receiptValue}>{selectedDetail.hours}시간</Text>
                                </View>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>기본 시급</Text>
                                    <Text style={styles.receiptValue}>50,000원</Text>
                                </View>
                                <View style={[styles.receiptRow, styles.receiptRowBorder]}>
                                    <Text style={styles.receiptLabel}>총 지급액 (세전)</Text>
                                    <Text style={styles.receiptValue}>{(selectedDetail.amount).toLocaleString()}원</Text>
                                </View>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>사업소득세 (3%)</Text>
                                    <Text style={styles.receiptValue}>-{Math.floor(selectedDetail.amount * 0.03).toLocaleString()}원</Text>
                                </View>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>지방소득세 (0.3%)</Text>
                                    <Text style={styles.receiptValue}>-{Math.floor(selectedDetail.amount * 0.003).toLocaleString()}원</Text>
                                </View>
                                <View style={[styles.receiptRow, styles.receiptRowTotal]}>
                                    <Text style={styles.receiptTotalLabel}>실수령액 (세후)</Text>
                                    <Text style={styles.receiptTotalValue}>{(selectedDetail.amount * 0.967).toLocaleString()}원</Text>
                                </View>
                            </View>
                        )}

                        <Button
                            title="닫기"
                            variant="primary"
                            onPress={() => setSelectedDetail(null)}
                            style={{ paddingVertical: 15 }}
                        />
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

