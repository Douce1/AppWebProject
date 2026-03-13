import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, FileText, RefreshCcw, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { Button } from '@/src/components/atoms/Button';
import { httpClient } from '@/src/api/httpClient';
import { NotificationTopBar } from '@/src/components/organisms/NotificationTopBar';
import type { ApiSettlement } from '@/src/api/types';

function formatMonth(isoMonth: string): string {
    const [year, month] = isoMonth.split('-');
    return `${year}년 ${parseInt(month, 10)}월`;
}

/** undefined/null이어도 크래시 없이 포맷 (toLocaleString 오류 방지) */
function formatAmount(value: number | undefined | null): string {
    const n = value != null && Number.isFinite(value) ? value : 0;
    return n.toLocaleString();
}

function formatScheduledPayDate(iso: string | null | undefined): string {
    if (!iso) return '미정';
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function calcTax(gross: number | undefined | null) {
    const g = gross != null && Number.isFinite(gross) ? gross : 0;
    const incomeTax = Math.floor(g * 0.03);
    const localTax = Math.floor(g * 0.003);
    return { incomeTax, localTax, net: g - incomeTax - localTax };
}

export function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatPeriodLabel(start: string, end: string): string {
    return `${start} ~ ${end}`;
}

export function filterSettlementsByPeriod(
    settlements: ApiSettlement[],
    startMonth: string,
    endMonth: string,
): ApiSettlement[] {
    return settlements.filter((s) => s.month >= startMonth && s.month <= endMonth);
}

export function addMonths(ym: string, delta: number): string {
    const [y, m] = ym.split('-').map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function clampMonth(value: string, min: string, max: string): string {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

// MonthPicker component: a simple +/- year-month selector
interface MonthPickerProps {
    label: string;
    value: string; // YYYY-MM
    minValue?: string;
    maxValue?: string;
    onChange: (val: string) => void;
}

function MonthPicker({ label, value, minValue, maxValue, onChange }: MonthPickerProps) {
    const canDecrement = !minValue || addMonths(value, -1) >= minValue;
    const canIncrement = !maxValue || addMonths(value, 1) <= maxValue;

    return (
        <View style={pickerStyles.container}>
            <Text style={pickerStyles.label}>{label}</Text>
            <View style={pickerStyles.row}>
                <TouchableOpacity
                    onPress={() => canDecrement && onChange(addMonths(value, -1))}
                    disabled={!canDecrement}
                    style={[pickerStyles.arrow, !canDecrement && pickerStyles.arrowDisabled]}
                >
                    <ChevronLeft size={20} color={canDecrement ? Colors.brandInk : Colors.mutedForeground} />
                </TouchableOpacity>
                <Text style={pickerStyles.value}>{formatMonth(value)}</Text>
                <TouchableOpacity
                    onPress={() => canIncrement && onChange(addMonths(value, 1))}
                    disabled={!canIncrement}
                    style={[pickerStyles.arrow, !canIncrement && pickerStyles.arrowDisabled]}
                >
                    <ChevronRight size={20} color={canIncrement ? Colors.brandInk : Colors.mutedForeground} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const pickerStyles = StyleSheet.create({
    container: { marginBottom: 16 },
    label: { fontSize: 13, color: Colors.mutedForeground, marginBottom: 8, fontWeight: '500' },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surfaceSoft,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    arrow: { padding: 6 },
    arrowDisabled: { opacity: 0.4 },
    value: { fontSize: 16, fontWeight: '700', color: Colors.brandInk, flex: 1, textAlign: 'center' },
});

export default function IncomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [settlements, setSettlements] = useState<ApiSettlement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<ApiSettlement | null>(null);

    const currentMonth = getCurrentMonth();

    // Period filter state
    const [filterStart, setFilterStart] = useState(currentMonth);
    const [filterEnd, setFilterEnd] = useState(currentMonth);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [tempStart, setTempStart] = useState(currentMonth);
    const [tempEnd, setTempEnd] = useState(currentMonth);

    const loadSettlements = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await httpClient.getSettlements();
            setSettlements(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '정산 데이터를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettlements();
    }, [loadSettlements]);

    const currentMonthSettlement = settlements.find((s) => s.month === currentMonth);

    const filteredSettlements = filterSettlementsByPeriod(settlements, filterStart, filterEnd)
        .sort((a, b) => b.month.localeCompare(a.month));

    const openFilterModal = () => {
        setTempStart(filterStart);
        setTempEnd(filterEnd);
        setShowFilterModal(true);
    };

    const applyFilter = () => {
        setFilterStart(tempStart);
        setFilterEnd(tempEnd);
        setShowFilterModal(false);
    };

    const handleTempStartChange = (val: string) => {
        setTempStart(val);
        if (val > tempEnd) setTempEnd(val);
    };

    const handleTempEndChange = (val: string) => {
        setTempEnd(val);
        if (val < tempStart) setTempStart(val);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}>
            <View style={styles.header}>
                <NotificationTopBar title="정산" />
            </View>

            {/* 이번 달 카드 */}
            <View style={styles.incomeCard}>
                <Text style={styles.incomeLabel}>이번 달 예상 수입 (세전)</Text>

                {isLoading ? (
                    <ActivityIndicator color={Colors.brandInk} style={{ marginVertical: 12 }} />
                ) : error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : currentMonthSettlement ? (
                    <>
                        <View style={styles.amountRow}>
                            <Text style={styles.amountText}>
                                {formatAmount(currentMonthSettlement.grossAmount)}
                            </Text>
                            <Text style={styles.currencyText}>원</Text>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>총 수업 시간</Text>
                                <Text style={styles.statValue}>{currentMonthSettlement.totalHours}h</Text>
                            </View>
                            <View style={styles.verticalDivider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>시급</Text>
                                <Text style={styles.statValue}>
                                    {formatAmount(currentMonthSettlement.hourlyRate)}원
                                </Text>
                            </View>
                        </View>
                    </>
                ) : (
                    <Text style={styles.taxDeductedText}>이번 달 정산 데이터가 없습니다.</Text>
                )}

                <View style={styles.divider} />

                <View style={styles.paymentRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <RefreshCcw color={Colors.brandInk} size={14} style={{ marginRight: 6 }} />
                        <Text style={styles.paymentText}>
                            지급 예정일:{' '}
                            {currentMonthSettlement
                                ? formatScheduledPayDate(currentMonthSettlement.scheduledPayDate)
                                : '미정'}
                        </Text>
                    </View>
                    {currentMonthSettlement && (
                        <TouchableOpacity
                            onPress={() => setSelectedDetail(currentMonthSettlement)}
                            style={styles.detailButton}
                        >
                            <Text style={styles.detailButtonText}>상세보기 &gt;</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* 정산 내역 */}
            <View style={styles.historySection}>
                <View style={styles.historyHeader}>
                    <Text style={styles.sectionTitle}>정산 내역</Text>
                    <View style={styles.historyHeaderRight}>
                        <TouchableOpacity
                            onPress={openFilterModal}
                            style={styles.periodPill}
                            testID="period-filter-pill"
                        >
                            <Text style={styles.periodPillText}>
                                {formatPeriodLabel(filterStart, filterEnd)}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={loadSettlements} disabled={isLoading} style={styles.refreshButton}>
                            <RefreshCcw color={Colors.brandInk} size={16} />
                        </TouchableOpacity>
                    </View>
                </View>

                {isLoading && <ActivityIndicator color={Colors.brandInk} />}

                {!isLoading && !error && filteredSettlements.length === 0 && (
                    <Text style={styles.emptyHistoryText}>
                        {filterStart === filterEnd
                            ? `${formatMonth(filterStart)} 정산 내역이 없습니다.`
                            : `${formatMonth(filterStart)} ~ ${formatMonth(filterEnd)} 정산 내역이 없습니다.`}
                    </Text>
                )}

                {!isLoading &&
                    filteredSettlements.map((item) => (
                        <TouchableOpacity
                            key={item.settlementId ?? `${item.lessonId}-${item.month}`}
                            style={styles.historyItem}
                            onPress={() => setSelectedDetail(item)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View style={styles.historyIconBox}>
                                    <FileText color={Colors.brandInk} size={20} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.historyTitle}>{formatMonth(item.month)} 정산</Text>
                                    <Text style={styles.historyDate}>
                                        {item.paidAt
                                            ? `지급 완료: ${new Date(item.paidAt).toLocaleDateString('ko-KR')}`
                                            : item.status === 'PENDING'
                                            ? '정산 대기'
                                            : item.status}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.historyAmount}>
                                    {formatAmount(item.grossAmount)}원
                                </Text>
                                <Text style={styles.historyTaxAmount}>
                                    실수령 {formatAmount(item.grossAmount != null ? item.grossAmount * 0.967 : 0)}원
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
            </View>

            {/* 기간 필터 모달 */}
            <Modal
                visible={showFilterModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowFilterModal(false)}
                testID="filter-modal"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>기간 설정</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <X size={24} color={Colors.brandInk} />
                            </TouchableOpacity>
                        </View>

                        <MonthPicker
                            label="시작 월"
                            value={tempStart}
                            maxValue={tempEnd}
                            onChange={handleTempStartChange}
                        />
                        <MonthPicker
                            label="종료 월"
                            value={tempEnd}
                            minValue={tempStart}
                            onChange={handleTempEndChange}
                        />

                        <View style={styles.filterPreview}>
                            <Text style={styles.filterPreviewText}>
                                선택 기간: {formatPeriodLabel(tempStart, tempEnd)}
                            </Text>
                        </View>

                        <View style={styles.filterActions}>
                            <TouchableOpacity
                                onPress={() => setShowFilterModal(false)}
                                style={styles.cancelButton}
                                testID="filter-cancel"
                            >
                                <Text style={styles.cancelButtonText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={applyFilter}
                                style={styles.applyButton}
                                testID="filter-apply"
                            >
                                <Text style={styles.applyButtonText}>적용</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 상세 모달 */}
            <Modal
                visible={!!selectedDetail}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedDetail(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {selectedDetail ? formatMonth(selectedDetail.month) : ''} 정산 상세 내역
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedDetail(null)}>
                                <X size={24} color={Colors.brandInk} />
                            </TouchableOpacity>
                        </View>

                        {selectedDetail && (() => {
                            const { incomeTax, localTax, net } = calcTax(selectedDetail?.grossAmount);
                            return (
                                <View style={styles.receiptBox}>
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.receiptLabel}>총 근무 시간</Text>
                                        <Text style={styles.receiptValue}>{selectedDetail.totalHours}시간</Text>
                                    </View>
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.receiptLabel}>기본 시급</Text>
                                        <Text style={styles.receiptValue}>
                                            {formatAmount(selectedDetail.hourlyRate)}원
                                        </Text>
                                    </View>
                                    <View style={[styles.receiptRow, styles.receiptRowBorder]}>
                                        <Text style={styles.receiptLabel}>총 지급액 (세전)</Text>
                                        <Text style={styles.receiptValue}>
                                            {formatAmount(selectedDetail.grossAmount)}원
                                        </Text>
                                    </View>
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.receiptLabel}>사업소득세 (3%)</Text>
                                        <Text style={styles.receiptValue}>-{formatAmount(incomeTax)}원</Text>
                                    </View>
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.receiptLabel}>지방소득세 (0.3%)</Text>
                                        <Text style={styles.receiptValue}>-{formatAmount(localTax)}원</Text>
                                    </View>
                                    <View style={[styles.receiptRow, styles.receiptRowTotal]}>
                                        <Text style={styles.receiptTotalLabel}>실수령액 (세후)</Text>
                                        <Text style={styles.receiptTotalValue}>{formatAmount(net)}원</Text>
                                    </View>
                                </View>
                            );
                        })()}

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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingTop: 50, paddingBottom: 0, paddingHorizontal: 0, backgroundColor: Colors.background },
    incomeCard: { backgroundColor: '#FFF0C2', margin: 15, borderRadius: 16, borderTopRightRadius: 0, padding: 20, shadowColor: '#FFF0C2', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
    incomeLabel: { color: Colors.brandInk, fontSize: 14, marginBottom: 4, fontWeight: '500' },
    amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 5 },
    amountText: { color: '#F3C742', fontSize: 32, fontWeight: 'bold' },
    currencyText: { color: Colors.brandInk, fontSize: 18, marginLeft: 4, fontWeight: '600' },
    taxDeductedText: { color: Colors.brandInk, fontSize: 14, marginBottom: 20, fontWeight: '500', opacity: 0.7 },
    errorText: { color: 'red', fontSize: 13, marginVertical: 8 },
    statsRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 12, marginBottom: 15 },
    statBox: { flex: 1, alignItems: 'center' },
    statLabel: { color: Colors.brandInk, fontSize: 12, marginBottom: 4, opacity: 0.7 },
    statValue: { color: Colors.brandInk, fontSize: 16, fontWeight: 'bold' },
    verticalDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
    divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginVertical: 15 },
    paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    paymentText: { color: Colors.brandInk, fontSize: 14, opacity: 0.8 },
    detailButton: { paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#F3C742', borderRadius: 18 },
    detailButtonText: { color: '#FFF0C2', fontWeight: 'bold', fontSize: 12.5 },
    historySection: { paddingHorizontal: 20, marginTop: 10, paddingBottom: 20 },
    historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    historyHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.brandInk },
    refreshButton: { padding: 6 },
    periodPill: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        backgroundColor: Colors.brandMint,
        borderRadius: 20,
    },
    periodPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.brandInk,
    },
    historyItem: { backgroundColor: 'white', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, ...Shadows.card },
    historyIconBox: { backgroundColor: Colors.brandMint, padding: 10, borderRadius: 10, marginRight: 12 },
    historyTitle: { fontSize: 15, fontWeight: '600', color: Colors.brandInk, marginBottom: 4 },
    historyDate: { fontSize: 12, color: Colors.mutedForeground },
    historyAmount: { fontSize: 16, fontWeight: 'bold', color: Colors.brandInk },
    historyTaxAmount: { fontSize: 13, color: Colors.brandHoney, marginTop: 4, fontWeight: '500' },
    emptyHistoryText: { fontSize: 14, fontWeight: '500', color: Colors.mutedForeground, marginTop: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, minHeight: 300 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.brandInk },
    filterPreview: {
        backgroundColor: Colors.surfaceSoft,
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    filterPreviewText: { fontSize: 14, fontWeight: '600', color: Colors.brandInk },
    filterActions: { flexDirection: 'row', gap: 12 },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    cancelButtonText: { fontSize: 15, fontWeight: '600', color: Colors.mutedForeground },
    applyButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: Colors.brandHoney,
        alignItems: 'center',
    },
    applyButtonText: { fontSize: 15, fontWeight: '700', color: Colors.brandInk },
    receiptBox: { backgroundColor: Colors.surfaceSoft, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 25 },
    receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    receiptRowBorder: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: Colors.border, borderStyle: 'dashed' },
    receiptRowTotal: { marginTop: 15, paddingTop: 15, borderTopWidth: 2, borderTopColor: Colors.brandInk },
    receiptLabel: { color: Colors.mutedForeground, fontSize: 14 },
    receiptValue: { color: Colors.brandInk, fontSize: 14, fontWeight: '500' },
    receiptTotalLabel: { color: Colors.brandInk, fontSize: 16, fontWeight: 'bold' },
    receiptTotalValue: { color: Colors.brandHoney, fontSize: 18, fontWeight: 'bold' },
});
