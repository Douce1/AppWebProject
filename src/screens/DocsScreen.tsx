import { Colors, Radius, Shadows } from '@/constants/theme';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Bell, Camera, FileText } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { httpClient } from '../api/httpClient';
import type { ApiContract, ApiLessonRequest, ContractStatus } from '../api/types';
import { SegmentedTabs } from '@/src/components/molecules/SegmentedTabs';
import { NotificationTopBar } from '@/src/components/organisms/NotificationTopBar';

export default function DocsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams();

    const tabs = ['서류', '계약', '요청/제안'];
    const initialTabIndex = params.targetTab ? tabs.indexOf(params.targetTab as string) : 0;
    const [selectedTabIndex, setSelectedTabIndex] = useState(initialTabIndex >= 0 ? initialTabIndex : 0);
    const selectedTab = tabs[selectedTabIndex];

    const [contracts, setContracts] = useState<ApiContract[]>([]);
    const [contractsLoading, setContractsLoading] = useState(false);
    const [contractsError, setContractsError] = useState<string | null>(null);
    const contractFilterStatuses: (ContractStatus | 'ALL')[] = ['ALL', 'SENT', 'INSTRUCTOR_SIGNED', 'FULLY_SIGNED'];
    const [contractStatusFilter, setContractStatusFilter] = useState<ContractStatus | 'ALL'>('ALL');

    const [lessonRequests, setLessonRequests] = useState<ApiLessonRequest[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [requestsError, setRequestsError] = useState<string | null>(null);
    const [rejectModalOpenFor, setRejectModalOpenFor] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);

    useEffect(() => {
        if (selectedTab !== '계약') return;
        let mounted = true;
        setContractsError(null);
        setContractsLoading(true);
        httpClient.getContracts()
            .then((list) => { if (mounted) setContracts(list); })
            .catch(() => {
                if (mounted) {
                    setContracts([]);
                    setContractsError('계약 목록을 불러오지 못했습니다.');
                }
            })
            .finally(() => { if (mounted) setContractsLoading(false); });
        return () => { mounted = false; };
    }, [selectedTab]);

    useEffect(() => {
        if (selectedTab !== '요청/제안') return;
        let mounted = true;
        setRequestsError(null);
        setRequestsLoading(true);

        httpClient.getLessonRequests()
            .then((list) => {
                if (!mounted) return;
                setLessonRequests(list);
            })
            .catch((error: unknown) => {
                if (!mounted) return;
                // eslint-disable-next-line no-console
                console.log('[DocsScreen] failed to load lesson-requests', error);
                setRequestsError('수업 요청 목록을 불러오지 못했습니다.');
                setLessonRequests([]);
            })
            .finally(() => {
                if (mounted) setRequestsLoading(false);
            });

        return () => { mounted = false; };
    }, [selectedTab]);

    const contractStatusLabel = (s: ContractStatus): string => {
        const map: Record<ContractStatus, string> = {
            DRAFT: '초안',
            SENT: '서명 대기',
            INSTRUCTOR_SIGNED: '강사 서명 완료',
            FULLY_SIGNED: '체결 완료',
            VOID: '취소',
        };
        return map[s] ?? s;
    };

    const contractFilterLabel = (s: ContractStatus | 'ALL'): string => {
        if (s === 'ALL') return '전체';
        return contractStatusLabel(s);
    };

    const filteredContracts =
        contractStatusFilter === 'ALL'
            ? contracts
            : contracts.filter((c) => c.status === contractStatusFilter);

    const formatContractDate = (c: ApiContract): string => {
        if (c.effectiveFrom && c.effectiveTo) return `${c.effectiveFrom.slice(0, 10)} ~ ${c.effectiveTo.slice(0, 10)}`;
        if (c.effectiveFrom) return `${c.effectiveFrom.slice(0, 10)} 체결`;
        return '';
    };

    const handleRespond = async (requestId: string, action: 'ACCEPT' | 'REJECT', reason?: string) => {
        if (respondingRequestId) return;
        setRespondingRequestId(requestId);
        try {
            const updated = await httpClient.respondToRequest(requestId, {
                action,
                rejectionReason: reason?.trim() || undefined,
            });
            setLessonRequests((prev) =>
                prev.map((r) => (r.requestId === updated.requestId ? updated : r)),
            );
        } catch (error: unknown) {
            const e = error as { status?: number; message?: string };
            let message = e.message ?? '요청 처리 중 오류가 발생했습니다.';
            if (e.status === 409) {
                message = '이미 응답이 완료된 요청입니다.';
            }
            // eslint-disable-next-line no-alert
            alert(message);
        } finally {
            setRespondingRequestId(null);
            setRejectModalOpenFor(null);
            setRejectReason('');
        }
    };

    return (
        <View style={[styles.container, { paddingTop: Math.max(50, insets.top) }]}>
            <NotificationTopBar title="서류/계약" />

            {/* Top Tabs (Segmented) */}
            <SegmentedTabs
                tabs={tabs}
                activeIndex={selectedTabIndex}
                onChange={setSelectedTabIndex}
            />

            <ScrollView style={styles.contentContainer}>
                {selectedTab === '서류' && (
                    <Text style={styles.emptyText}>표시할 서류가 없습니다.</Text>
                )}

                {selectedTab === '계약' && (
                    <>
                        {/* 외부 계약서 등록 CTA 카드 */}
                        <TouchableOpacity 
                            style={styles.importCard} 
                            onPress={() => router.push('/docs/import' as any)}
                        >
                            <View style={styles.importIconContainer}>
                                <Camera color={Colors.brandInk} size={24} />
                            </View>
                            <View style={styles.importTextContainer}>
                                <Text style={styles.importTitle}>문서로 일정 만들기</Text>
                                <Text style={styles.importDesc}>외부 서류를 촬영하여 간편하게 일정을 등록하세요.</Text>
                            </View>
                        </TouchableOpacity>

                        {/* 계약 상태 필터 탭 */}
                        <View style={styles.contractFilterRow}>
                            {contractFilterStatuses.map((status) => (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.contractFilterChip,
                                        contractStatusFilter === status && styles.contractFilterChipActive,
                                    ]}
                                    onPress={() => setContractStatusFilter(status)}
                                >
                                    <Text
                                        style={[
                                            styles.contractFilterChipText,
                                            contractStatusFilter === status && styles.contractFilterChipTextActive,
                                        ]}
                                    >
                                        {contractFilterLabel(status)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {contractsError ? (
                            <View style={styles.errorRow}>
                                <Text style={styles.errorText}>{contractsError}</Text>
                            </View>
                        ) : contractsLoading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color={Colors.brandInk} />
                                <Text style={styles.loadingText}>계약 목록 불러오는 중...</Text>
                            </View>
                        ) : filteredContracts.length === 0 ? (
                            <Text style={styles.emptyText}>표시할 계약이 없습니다.</Text>
                        ) : (
                            filteredContracts.map((c) => (
                                <React.Fragment key={c.contractId}>
                                    <View style={styles.docCard}>
                                    <View style={styles.docIcon}>
                                        <FileText color="#10B981" size={24} />
                                    </View>
                                    <View style={styles.docInfo}>
                                        <Text style={styles.docTitle}>{c.title ?? `계약 ${c.contractId}`}</Text>
                                        <Text style={styles.docDate}>
                                            {formatContractDate(c)}
                                            {formatContractDate(c) ? ' · ' : ''}{contractStatusLabel(c.status)}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.viewButton}
                                        onPress={() => router.push(`/docs/contract?contractId=${encodeURIComponent(c.contractId)}`)}
                                    >
                                        <Text style={styles.viewButtonText}>보기</Text>
                                    </TouchableOpacity>
                                </View>
                                </React.Fragment>
                            ))
                        )}
                    </>
                )}

                {selectedTab === '요청/제안' && (
                    <View style={styles.requestCard}>
                        <View style={styles.requestHeader}>
                            <View style={styles.requestBadgeRow}>
                                <Bell color="#EF4444" size={16} />
                                <Text style={styles.requestStatusText}>수업 요청 / 제안</Text>
                            </View>
                            <Text style={styles.requestMetaText}>백엔드 연동 상태 기준</Text>
                        </View>

                        {requestsLoading && (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color={Colors.brandInk} />
                                <Text style={styles.loadingText}>수업 요청을 불러오는 중...</Text>
                            </View>
                        )}

                        {requestsError && !requestsLoading && (
                            <View style={styles.errorRow}>
                                <Text style={styles.errorText}>{requestsError}</Text>
                            </View>
                        )}

                        {!requestsLoading && !requestsError && lessonRequests.length === 0 && (
                            <Text style={styles.emptyText}>현재 대기 중인 수업 요청이 없습니다.</Text>
                        )}

                        {!requestsLoading && !requestsError && lessonRequests.map((req) => {
                            const isPending = req.status === 'PENDING';
                            const isResponded = req.status === 'ACCEPTED' || req.status === 'REJECTED' || req.status === 'CANCELLED';
                            const requestedDate = req.requestedAt.slice(0, 10);
                            const isRejectingThis = rejectModalOpenFor === req.requestId;
                            const isBusy = respondingRequestId === req.requestId;

                            const statusLabel =
                                req.status === 'PENDING' ? '미응답' :
                                    req.status === 'ACCEPTED' ? '수락됨' :
                                        req.status === 'REJECTED' ? '거절됨' :
                                            '취소됨';

                            return (
                                <View key={req.requestId} style={styles.requestItemCard}>
                                    <View style={styles.requestItemHeader}>
                                        <Text style={styles.requestItemTitle}>요청 ID: {req.requestId}</Text>
                                        <Text style={styles.requestItemStatus}>{statusLabel}</Text>
                                    </View>
                                    <Text style={styles.requestItemMeta}>요청일: {requestedDate}</Text>
                                    {req.rejectionReason && (
                                        <Text style={styles.requestItemMeta}>거절 사유: {req.rejectionReason}</Text>
                                    )}
                                    <View style={styles.requestActions}>
                                        <TouchableOpacity
                                            style={[styles.acceptButton, (!isPending || isBusy) && { opacity: 0.6 }]}
                                            onPress={() => handleRespond(req.requestId, 'ACCEPT')}
                                            disabled={!isPending || isBusy}
                                        >
                                            <Text style={styles.acceptButtonText}>
                                                {isBusy && isPending ? '처리 중...' : '수락'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.rejectButton, (!isPending || isBusy) && { opacity: 0.6 }]}
                                            onPress={() => {
                                                if (!isPending || isBusy) return;
                                                setRejectModalOpenFor(isRejectingThis ? null : req.requestId);
                                                setRejectReason('');
                                            }}
                                            disabled={!isPending || isBusy}
                                        >
                                            <Text style={styles.rejectButtonText}>거절</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {isPending && isRejectingThis && (
                                        <View style={styles.rejectInputContainer}>
                                            <TextInput
                                                style={styles.rejectInput}
                                                placeholder="거절 사유를 입력해주세요... (선택 사항)"
                                                value={rejectReason}
                                                onChangeText={setRejectReason}
                                                multiline
                                                textAlignVertical="top"
                                            />
                                            <View style={styles.requestActions}>
                                                <TouchableOpacity
                                                    style={styles.cancelRejectButton}
                                                    onPress={() => {
                                                        setRejectModalOpenFor(null);
                                                        setRejectReason('');
                                                    }}
                                                    disabled={isBusy}
                                                >
                                                    <Text style={styles.cancelRejectButtonText}>취소</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.submitRejectButton}
                                                    onPress={() => handleRespond(req.requestId, 'REJECT', rejectReason)}
                                                    disabled={isBusy}
                                                >
                                                    <Text style={styles.submitRejectButtonText}>거절 완료</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                    {isResponded && !isPending && (
                                        <Text style={styles.requestFooterNote}>
                                            응답이 서버에 저장되었습니다. 다시 들어와도 동일하게 표시됩니다.
                                        </Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 15 },
    topBarTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', lineHeight: 32 },
    topBarIcons: { flexDirection: 'row', alignItems: 'center' },
    settingsIconContainer: { padding: 8 },
    tabContainer: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    tabButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, backgroundColor: '#f0f0f0' },
    activeTabButton: { backgroundColor: Colors.brandInk },
    tabText: { fontSize: 13, color: '#666', fontWeight: '500' },
    activeTabText: { color: 'white', fontWeight: 'bold' },
    contentContainer: { padding: 15 },
    todoBadgeContainer: { alignSelf: 'flex-start', backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#FECACA' },
    todoBadgeText: { color: '#DC2626', fontWeight: 'bold', fontSize: 14 },
    docCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 10 },
    docIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    docInfo: { flex: 1 },
    docTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
    docDate: { fontSize: 12, color: '#666' },
    signButton: { backgroundColor: Colors.brandInk, paddingHorizontal: 12, paddingVertical: 6, ...Radius.button },
    signButtonText: { color: Colors.brandHoney, fontWeight: 'bold', fontSize: 13 },
    viewButton: { backgroundColor: Colors.surfaceSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    viewButtonText: { color: Colors.brandInk, fontWeight: 'bold', fontSize: 13 },
    loadingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
    loadingText: { fontSize: 13, color: '#6B7280' },
    emptyText: { fontSize: 13, color: '#9CA3AF', padding: 16 },
    contractFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    contractFilterChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#f0f0f0' },
    contractFilterChipActive: { backgroundColor: '#F3C742', borderTopRightRadius: 0 },
    contractFilterChipText: { fontSize: 13, color: '#666', fontWeight: '500' },
    contractFilterChipTextActive: { color: Colors.brandInk, fontWeight: 'bold' },
    errorRow: { padding: 16, backgroundColor: '#FEE2E2', borderRadius: 8, marginBottom: 8 },
    errorText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },

    importCard: { backgroundColor: '#F0F9FF', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#BAE6FD' },
    importIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    importTextContainer: { flex: 1 },
    importTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.brandInk, marginBottom: 4 },
    importDesc: { fontSize: 13, color: '#64748B' },

    requestCard: { backgroundColor: 'white', padding: 16, borderRadius: 16, ...Shadows.card, marginBottom: 16 },
    requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    requestBadgeRow: { flexDirection: 'row', alignItems: 'center' },
    ddayBadge: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    ddayText: { color: '#DC2626', fontWeight: '700', fontSize: 12 },
    requestStatusText: { marginLeft: 6, fontSize: 12, color: '#DC2626', fontWeight: '600' },
    requestMetaText: { fontSize: 11, color: '#9CA3AF' },
    requestTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
    requestBody: { backgroundColor: Colors.brandMint, borderRadius: 12, padding: 12, marginBottom: 12 },
    requestBullet: { fontSize: 13, color: Colors.brandInk, marginBottom: 4 },
    requestActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    acceptButton: { flex: 1, backgroundColor: '#F3C742', paddingVertical: 10, ...Radius.button, alignItems: 'center', marginRight: 8 },
    acceptButtonText: { color: '#251B10', fontWeight: '700', fontSize: 14 },
    rejectButton: { flex: 1, backgroundColor: '#F2B8B5', paddingVertical: 10, ...Radius.button, alignItems: 'center', marginLeft: 8 },
    rejectButtonText: { color: '#B42318', fontWeight: '700', fontSize: 14 },

    rejectInputContainer: { marginTop: 10 },
    rejectInput: { backgroundColor: Colors.surfaceSoft, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 12, minHeight: 60, fontSize: 13, marginBottom: 10, textAlignVertical: 'top' },
    cancelRejectButton: { flex: 1, backgroundColor: Colors.surfaceSoft, paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginRight: 8 },
    cancelRejectButtonText: { color: Colors.brandInk, fontWeight: '700', fontSize: 14 },
    submitRejectButton: { flex: 1, backgroundColor: Colors.brandInk, paddingVertical: 10, ...Radius.button, alignItems: 'center', marginLeft: 8 },
    submitRejectButtonText: { color: Colors.brandHoney, fontWeight: '700', fontSize: 14 },

    requestItemCard: { marginTop: 10, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, backgroundColor: Colors.surfaceSoft },
    requestItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    requestItemTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
    requestItemStatus: { fontSize: 12, fontWeight: '600', color: Colors.brandInk },
    requestItemMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    requestFooterNote: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
});
