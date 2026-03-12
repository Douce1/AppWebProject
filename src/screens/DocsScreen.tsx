import { Colors, Radius, Shadows } from '@/constants/theme';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Pressable } from 'react-native';
import { Bell, Camera, FileText } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ApiContract, ApiLessonRequest, ContractStatus } from '../api/types';
import { formatLessonCardLocation } from '../utils/lessonCardLocation';
import { SegmentedTabs } from '@/src/components/molecules/SegmentedTabs';
import { NotificationTopBar } from '@/src/components/organisms/NotificationTopBar';
import { useContractsQuery, useLessonRequestsQuery, useRespondToRequestMutation } from '../query/hooks';

/** 이슈 #135: 순서 제안 → 계약 → 서류, '요청/제안' → '제안' 통일 */
const DOCS_TABS = ['제안', '계약', '서류'] as const;

export default function DocsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ targetTab?: string | string[] }>();
    const rawTargetTab = typeof params.targetTab === 'string'
        ? params.targetTab
        : Array.isArray(params.targetTab)
          ? params.targetTab[0]
          : undefined;
    /** 딥링크 호환: 기존 '요청/제안' 파라미터를 '제안'으로 매핑 (이슈 #135) */
    const targetTab = rawTargetTab === '요청/제안' ? '제안' : rawTargetTab;

    const [selectedTabIndex, setSelectedTabIndex] = useState(0);
    const selectedTab = DOCS_TABS[selectedTabIndex];
    // 이슈 #149: DRAFT 추가 → 수락 직후 생성된 초안 계약을 필터로 확인 가능
    const contractFilterStatuses: (ContractStatus | 'ALL')[] = ['ALL', 'DRAFT', 'SENT', 'INSTRUCTOR_SIGNED', 'FULLY_SIGNED'];
    const [contractStatusFilter, setContractStatusFilter] = useState<ContractStatus | 'ALL'>('ALL');
    const [rejectModalOpenFor, setRejectModalOpenFor] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const contractsQuery = useContractsQuery({ enabled: selectedTab === '계약' });
    const lessonRequestsQuery = useLessonRequestsQuery({ enabled: selectedTab === '제안' });
    const respondToRequestMutation = useRespondToRequestMutation();
    const contracts = contractsQuery.data ?? [];
    const lessonRequests = lessonRequestsQuery.data ?? [];
    const contractsLoading = contractsQuery.isLoading || contractsQuery.isFetching;
    const requestsLoading = lessonRequestsQuery.isLoading || lessonRequestsQuery.isFetching;
    const contractsError = contractsQuery.isError ? '계약 목록을 불러오지 못했습니다.' : null;
    const requestsError = lessonRequestsQuery.isError ? '수업 요청 목록을 불러오지 못했습니다.' : null;
    const respondingRequestId = respondToRequestMutation.variables?.requestId ?? null;

    useEffect(() => {
        if (!targetTab) {
            return;
        }

        const nextIndex = DOCS_TABS.indexOf(targetTab as (typeof DOCS_TABS)[number]);
        if (nextIndex >= 0) {
            setSelectedTabIndex(nextIndex);
        }
    }, [targetTab]);

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

    const pendingLessonRequests = lessonRequests.filter((request) => request.status === 'PENDING');
    const respondedLessonRequests = lessonRequests.filter((request) => request.status !== 'PENDING');

    const formatLessonSchedule = (req: ApiLessonRequest): string => {
        if (!req.startsAt) return '일정 정보 없음';
        const start = new Date(req.startsAt);
        if (Number.isNaN(start.getTime())) return '일정 정보 없음';
        const end = req.endsAt ? new Date(req.endsAt) : null;
        const date = new Intl.DateTimeFormat('ko-KR', {
            month: 'numeric',
            day: 'numeric',
            weekday: 'short',
        }).format(start);
        const startTime = new Intl.DateTimeFormat('ko-KR', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false,
        }).format(start);

        if (!end || Number.isNaN(end.getTime())) {
            return `${date} ${startTime}`;
        }

        const endTime = new Intl.DateTimeFormat('ko-KR', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false,
        }).format(end);

        return `${date} ${startTime} - ${endTime}`;
    };

    const formatLessonLocation = (req: ApiLessonRequest): string => {
        const loc = formatLessonCardLocation({
            region: req.region ?? '',
            museum: req.museum,
            venueName: req.venueName,
        });
        return loc || '장소 정보 없음';
    };

    const lessonRequestStatusLabel = (status: ApiLessonRequest['status']): string => {
        if (status === 'PENDING') return '미응답';
        if (status === 'ACCEPTED') return '수락됨';
        if (status === 'REJECTED') return '거절됨';
        return '취소됨';
    };

    const formatContractDate = (c: ApiContract): string => {
        if (c.effectiveFrom && c.effectiveTo) return `${c.effectiveFrom.slice(0, 10)} ~ ${c.effectiveTo.slice(0, 10)}`;
        if (c.effectiveFrom) return `${c.effectiveFrom.slice(0, 10)} 체결`;
        return '';
    };

    const handleRespond = async (requestId: string, action: 'ACCEPT' | 'REJECT', reason?: string) => {
        if (respondToRequestMutation.isPending) return;
        try {
            await respondToRequestMutation.mutateAsync({
                requestId,
                action,
                rejectionReason: reason?.trim() || undefined,
            });

            if (action === 'ACCEPT') {
                Alert.alert(
                    '수락 완료',
                    '초안 계약이 생성되었습니다. 계약 탭에서 확인하세요.',
                    [
                        { text: '나중에', style: 'cancel' },
                        { 
                            text: '계약 확인하기', 
                            onPress: () => {
                                // '계약' 탭 인덱스는 1 (순서: 제안=0, 계약=1, 서류=2)
                                setSelectedTabIndex(1);
                            }
                        }
                    ]
                );
            }
        } catch (error: unknown) {
            const e = error as { status?: number; message?: string };
            let message = e.message ?? '요청 처리 중 오류가 발생했습니다.';
            if (e.status === 409) {
                message = '이미 응답이 완료된 요청입니다.';
            }
            alert(message);
        } finally {
            setRejectModalOpenFor(null);
            setRejectReason('');
        }
    };

    return (
        <View style={[styles.container, { paddingTop: Math.max(50, insets.top) }]}>
            <NotificationTopBar title="서류/계약" />

            {/* Top Tabs (Segmented) */}
            <SegmentedTabs
                tabs={[...DOCS_TABS]}
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
                            onPress={() => router.push({ pathname: '/docs/import' })}
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
                            filteredContracts.map((c) => {
                                const dateStr = formatContractDate(c);
                                return (
                                    <View key={c.contractId} style={styles.docCard}>
                                        <View style={styles.docIcon}>
                                            <FileText color="#10B981" size={24} />
                                        </View>
                                        <View style={styles.docInfo}>
                                            <Text style={styles.docTitle}>{c.title?.trim() || '제목 없음'}</Text>
                                            <Text style={styles.docDate}>
                                                {dateStr}
                                                {dateStr ? ' · ' : ''}{contractStatusLabel(c.status)}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.viewButton}
                                            onPress={() => router.push({
                                                pathname: '/(tabs)/docs/contract',
                                                params: { contractId: c.contractId },
                                            })}
                                        >
                                            <Text style={styles.viewButtonText}>보기</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })
                        )}
                    </>
                )}

                {selectedTab === '제안' && (
                    <View style={styles.requestCard}>
                        <View style={styles.requestHeader}>
                            <View style={styles.requestBadgeRow}>
                                <Bell color="#EF4444" size={16} />
                                <Text style={styles.requestStatusText}>제안</Text>
                            </View>
                            <Text style={styles.requestMetaText}>
                                대기 {pendingLessonRequests.length}건 · 전체 {lessonRequests.length}건
                            </Text>
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

                        {!requestsLoading && !requestsError && pendingLessonRequests.length > 0 && (
                            <View style={styles.requestSection}>
                                <View style={styles.requestSectionHeader}>
                                    <Text style={styles.requestSectionTitle}>대기 중인 요청</Text>
                                    <Text style={styles.requestSectionCount}>{pendingLessonRequests.length}건</Text>
                                </View>
                            </View>
                        )}

                        {!requestsLoading && !requestsError && pendingLessonRequests.length === 0 && lessonRequests.length > 0 && (
                            <View style={styles.requestSection}>
                                <View style={styles.requestSectionHeader}>
                                    <Text style={styles.requestSectionTitle}>대기 중인 요청</Text>
                                    <Text style={styles.requestSectionCount}>0건</Text>
                                </View>
                                <Text style={styles.emptyText}>현재 응답이 필요한 요청은 없습니다.</Text>
                            </View>
                        )}

                        {!requestsLoading && !requestsError && pendingLessonRequests.map((req) => {
                            const isPending = req.status === 'PENDING';
                            const isRejectingThis = rejectModalOpenFor === req.requestId;
                            const isBusy = respondingRequestId === req.requestId;
                            const lessonTitle = req.lessonTitle?.trim() || '수업명 미정';
                            const lessonSchedule = formatLessonSchedule(req);
                            const lessonLocation = formatLessonLocation(req);

                            return (
                                <Pressable
                                    key={req.requestId}
                                    style={({ pressed }) => [
                                        styles.requestItemCard,
                                        styles.pendingRequestItemCard,
                                        pressed && styles.requestItemCardPressed,
                                    ]}
                                    onPress={() => router.push({
                                        pathname: './request',
                                        params: { requestId: req.requestId },
                                    })}
                                >
                                    <View style={styles.requestItemHeader}>
                                        <Text style={styles.requestItemTitle}>{lessonTitle}</Text>
                                        <Text style={[styles.requestItemStatus, styles.pendingRequestItemStatus]}>미응답</Text>
                                    </View>
                                    <Text style={styles.requestItemPrimaryMeta}>{lessonSchedule}</Text>
                                    <Text style={styles.requestItemMeta}>{lessonLocation}</Text>
                                    {isPending && (
                                        <View style={styles.requestActions}>
                                            <TouchableOpacity
                                                style={[styles.acceptButton, isBusy && { opacity: 0.6 }]}
                                                onPress={() => handleRespond(req.requestId, 'ACCEPT')}
                                                disabled={isBusy}
                                            >
                                                <Text style={styles.acceptButtonText}>
                                                    {isBusy ? '처리 중...' : '수락'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.rejectButton, isBusy && { opacity: 0.6 }]}
                                                onPress={() => {
                                                    if (isBusy) return;
                                                    setRejectModalOpenFor(isRejectingThis ? null : req.requestId);
                                                    setRejectReason('');
                                                }}
                                                disabled={isBusy}
                                            >
                                                <Text style={styles.rejectButtonText}>거절</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
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
                                </Pressable>
                            );
                        })}

                        {!requestsLoading && !requestsError && respondedLessonRequests.length > 0 && (
                            <View style={styles.requestHistorySection}>
                                <View style={styles.requestSectionHeader}>
                                    <Text style={styles.requestSectionTitle}>응답 완료 이력</Text>
                                    <Text style={styles.requestSectionCount}>{respondedLessonRequests.length}건</Text>
                                </View>
                            </View>
                        )}

                        {!requestsLoading && !requestsError && respondedLessonRequests.map((req) => {
                            const isResponded =
                                req.status === 'ACCEPTED' ||
                                req.status === 'REJECTED' ||
                                req.status === 'CANCELLED';
                            const lessonTitle = req.lessonTitle?.trim() || '수업명 미정';
                            const lessonSchedule = formatLessonSchedule(req);
                            const lessonLocation = formatLessonLocation(req);
                            const statusLabel = lessonRequestStatusLabel(req.status);

                            return (
                                <Pressable
                                    key={req.requestId}
                                    style={({ pressed }) => [
                                        styles.requestItemCard,
                                        pressed && styles.requestItemCardPressed,
                                    ]}
                                    onPress={() => router.push({
                                        pathname: './request',
                                        params: { requestId: req.requestId },
                                    })}
                                >
                                    <View style={styles.requestItemHeader}>
                                        <Text style={styles.requestItemTitle}>{lessonTitle}</Text>
                                        <Text style={styles.requestItemStatus}>{statusLabel}</Text>
                                    </View>
                                    <Text style={styles.requestItemPrimaryMeta}>{lessonSchedule}</Text>
                                    <Text style={styles.requestItemMeta}>{lessonLocation}</Text>
                                    {req.rejectionReason && (
                                        <Text style={styles.requestItemMeta}>거절 사유: {req.rejectionReason}</Text>
                                    )}
                                </Pressable>
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
    requestSection: { marginTop: 8, marginBottom: 8 },
    requestHistorySection: { marginTop: 16, marginBottom: 8 },
    requestSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    requestSectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
    requestSectionCount: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
    requestSectionDescription: { fontSize: 12, color: '#6B7280', marginTop: 4 },
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
    requestItemCardPressed: { opacity: 0.92 },
    pendingRequestItemCard: { backgroundColor: '#FFF7E8', borderWidth: 1, borderColor: '#F3C742' },
    requestItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    requestItemTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
    requestItemStatus: { fontSize: 12, fontWeight: '600', color: Colors.brandInk },
    pendingRequestItemStatus: { color: '#B45309' },
    requestItemPrimaryMeta: { fontSize: 13, color: '#374151', marginTop: 2, fontWeight: '600' },
    requestItemMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    requestFooterNote: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
});
