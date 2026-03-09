import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { FileText, RefreshCcw, Settings, TrendingUp, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IncomeOverviewCard } from '@/src/components/organisms/IncomeOverviewCard';

export default function IncomeScreen() {
    const router = useRouter();
    const [selectedDetail, setSelectedDetail] = useState<any>(null);

    const historyData = [
        { id: 1, month: '9월', amount: 3080000, date: '10.10 지급완료', hours: 62 },
        { id: 2, month: '8월', amount: 3150000, date: '09.10 지급완료', hours: 65 }
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>수입/정산</Text>
                <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.settingsIconContainer}>
                    <Settings color="#666" size={26} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setSelectedDetail({ month: '10월', amount: 3450000, hours: 68 })}
                style={{ paddingHorizontal: 15 }}
            >
                <IncomeOverviewCard
                    title="이번 달 예상 수입 (세전)"
                    amount="3,450,000"
                    subtitle="실수령 예상 (3.3% 공제): 3,336,150원"
                    dateStr="지급 예정일: 11월 10일"
                />
            </TouchableOpacity>

            <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>정산 내역</Text>

                {historyData.map(item => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.historyItem}
                        onPress={() => setSelectedDetail(item)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.historyIconBox}>
                                <FileText color="#3b82f6" size={20} />
                            </View>
                            <View>
                                <Text style={styles.historyTitle}>{item.month} 정산금</Text>
                                <Text style={styles.historyDate}>{item.date}</Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.historyAmount}>+{(item.amount).toLocaleString()}원</Text>
                            <Text style={styles.historyTaxAmount}>실수령 {(item.amount * 0.967).toLocaleString()}원</Text>
                        </View>
                    </TouchableOpacity>
                ))}
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
                                <X size={24} color="#333" />
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
                                <View style={[styles.receiptRow, { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#e5e7eb', borderStyle: 'dashed' }]}>
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
                                <View style={[styles.receiptRow, { marginTop: 15, paddingTop: 15, borderTopWidth: 2, borderTopColor: '#333' }]}>
                                    <Text style={styles.receiptTotalLabel}>실수령액 (세후)</Text>
                                    <Text style={styles.receiptTotalValue}>{(selectedDetail.amount * 0.967).toLocaleString()}원</Text>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedDetail(null)}>
                            <Text style={styles.closeButtonText}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 15 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    settingsIconContainer: { padding: 8 },
    incomeCard: { backgroundColor: '#1E3A8A', margin: 15, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    incomeLabel: { color: '#D1D5DB', fontSize: 14, marginBottom: 4 },
    amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 5 },
    amountText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    currencyText: { color: 'white', fontSize: 18, marginLeft: 4, fontWeight: '600' },
    taxDeductedText: { color: '#A7F3D0', fontSize: 14, marginBottom: 20, fontWeight: '500' },
    statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 12, marginBottom: 15 },
    statBox: { flex: 1, alignItems: 'center' },
    statLabel: { color: '#D1D5DB', fontSize: 12, marginBottom: 4 },
    statValue: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    verticalDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
    increaseBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    increaseText: { color: '#10B981', fontSize: 13, fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 15 },
    paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    paymentText: { color: '#E5E7EB', fontSize: 14 },
    detailButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    detailButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    historySection: { paddingHorizontal: 20, marginTop: 10, paddingBottom: 40 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    historyItem: { backgroundColor: 'white', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    historyIconBox: { backgroundColor: '#EFF6FF', padding: 10, borderRadius: 10, marginRight: 12 },
    historyTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
    historyDate: { fontSize: 12, color: '#6B7280' },
    historyAmount: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    historyTaxAmount: { fontSize: 13, color: '#10B981', marginTop: 4, fontWeight: '500' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, minHeight: 400 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    receiptBox: { backgroundColor: '#F9FAFB', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 25 },
    receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    receiptLabel: { color: '#6B7280', fontSize: 14 },
    receiptValue: { color: '#374151', fontSize: 14, fontWeight: '500' },
    receiptTotalLabel: { color: '#111827', fontSize: 16, fontWeight: 'bold' },
    receiptTotalValue: { color: '#10B981', fontSize: 18, fontWeight: 'bold' },
    closeButton: { backgroundColor: '#1E3A8A', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
    closeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
