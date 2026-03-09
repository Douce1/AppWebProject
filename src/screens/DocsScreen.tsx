import { Colors, Radius, Shadows } from '@/constants/theme';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { FileSignature, FileText, Bell, Settings } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchedule } from '../context/ScheduleContext';
import { apiClient } from '../api/apiClient';
import type { ApiContract, ContractStatus } from '../api/types';
import { SegmentedTabs } from '@/src/components/molecules/SegmentedTabs';

export default function DocsScreen() {
    const insets = useSafeAreaInsets();
    const { proposalStatus, resolveProposal } = useSchedule();
    const router = useRouter();
    const params = useLocalSearchParams();

    const tabs = ['서류', '계약', '요청/제안'];
    const initialTabIndex = params.targetTab ? tabs.indexOf(params.targetTab as string) : 0;
    const [selectedTabIndex, setSelectedTabIndex] = useState(initialTabIndex >= 0 ? initialTabIndex : 0);
    const selectedTab = tabs[selectedTabIndex];

    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const [contracts, setContracts] = useState<ApiContract[]>([]);
    const [contractsLoading, setContractsLoading] = useState(false);

    useEffect(() => {
        if (selectedTab !== '계약') return;
        let mounted = true;
        setContractsLoading(true);
        apiClient.getContracts()
            .then((list) => { if (mounted) setContracts(list); })
            .catch(() => { if (mounted) setContracts([]); })
            .finally(() => { if (mounted) setContractsLoading(false); });
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

    const formatContractDate = (c: ApiContract): string => {
        if (c.effectiveFrom && c.effectiveTo) return `${c.effectiveFrom.slice(0, 10)} ~ ${c.effectiveTo.slice(0, 10)}`;
        if (c.effectiveFrom) return `${c.effectiveFrom.slice(0, 10)} 체결`;
        return '';
    };

    const handleRejectSubmit = () => {
        if (rejectReason.trim()) {
            resolveProposal('거절');
        }
    };

    return (
        <View style={[styles.container, { paddingTop: Math.max(50, insets.top) }]}>
            {/* Top Bar with Settings */}
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>서류/계약</Text>
                <View style={styles.topBarIcons}>
                    <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.settingsIconContainer}>
                        <Settings color="#666" size={26} />
                    </TouchableOpacity>
                </View>
            </View>

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
                        {contractsLoading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color={Colors.brandInk} />
                                <Text style={styles.loadingText}>계약 목록 불러오는 중...</Text>
                            </View>
                        ) : contracts.length === 0 ? (
                            <Text style={styles.emptyText}>표시할 계약이 없습니다.</Text>
                        ) : (
                            contracts.map((c) => (
                                <View key={c.contractId} style={styles.docCard}>
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
                                        onPress={() => router.push(`/(tabs)/docs/contract?contractId=${encodeURIComponent(c.contractId)}`)}
                                    >
                                        <Text style={styles.viewButtonText}>보기</Text>
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </>
                )}

                {selectedTab === '요청/제안' && (
                    <View style={styles.requestCard}>
                        <View style={styles.requestHeader}>
                            <View style={styles.requestBadgeRow}>
                                {proposalStatus === '미응답' && (
                                    <View style={styles.ddayBadge}>
                                        <Text style={styles.ddayText}>D-1</Text>
                                    </View>
                                )}
                                <Bell color="#EF4444" size={16} style={{ marginLeft: proposalStatus === '미응답' ? 6 : 0 }} />
                                <Text style={styles.requestStatusText}>제안 건</Text>
                            </View>
                            <Text style={styles.requestMetaText}>{proposalStatus === '미응답' ? '미응답' : `${proposalStatus} 완료`}</Text>
                        </View>

                        <Text style={styles.requestTitle}>제안 상세는 곧 연동될 예정입니다.</Text>

                        <View style={styles.requestBody}>
                            <Text style={styles.requestBullet}>실제 수업 제안이 도착하면 이 영역에 상세 정보가 표시됩니다.</Text>
                        </View>

                        {proposalStatus === '미응답' && !isRejecting && (
                            <View style={styles.requestActions}>
                                <TouchableOpacity style={styles.acceptButton} onPress={() => resolveProposal('수락')}>
                                    <Text style={styles.acceptButtonText}>수락</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.rejectButton} onPress={() => setIsRejecting(true)}>
                                    <Text style={styles.rejectButtonText}>거절</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {proposalStatus === '미응답' && isRejecting && (
                            <View style={styles.rejectInputContainer}>
                                <TextInput
                                    style={styles.rejectInput}
                                    placeholder="거절 사유를 입력해주세요..."
                                    value={rejectReason}
                                    onChangeText={setRejectReason}
                                    multiline
                                    textAlignVertical="top"
                                />
                                <View style={styles.requestActions}>
                                    <TouchableOpacity style={styles.cancelRejectButton} onPress={() => setIsRejecting(false)}>
                                        <Text style={styles.cancelRejectButtonText}>취소</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.submitRejectButton} onPress={handleRejectSubmit}>
                                        <Text style={styles.submitRejectButtonText}>거절 완료</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
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
});
