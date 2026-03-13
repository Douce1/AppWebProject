import { Colors, Shadows } from '@/constants/theme';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import { apiClient } from '../api/apiClient';
import { getContractErrorMessage, SIGN_TOKEN_EXPIRED, PDF_NOT_READY, PDF_AUTH_EXPIRED, PDF_ACCESS_DENIED } from '../api/contractErrors';
import type { ApiContractDetail } from '../api/types';
import { queryKeys } from '../query/queryKeys';

function parseContentJson(contentJson: string | undefined): { title: string; content: string }[] {
  if (!contentJson) return [];
  try {
    const o = JSON.parse(contentJson) as { sections?: { title: string; content: string }[] };
    return o.sections ?? [];
  } catch {
    return [];
  }
}

export default function DocContractDetailScreen() {
  const params = useLocalSearchParams<{ contractId?: string | string[] }>();
  const router = useRouter();
  const contractId = typeof params.contractId === 'string' ? params.contractId : Array.isArray(params.contractId) ? params.contractId[0] : undefined;

  const queryClient = useQueryClient();
  const [detail, setDetail] = useState<ApiContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentTextVersion] = useState('1.0');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null);
  const [signToken, setSignToken] = useState<string | null>(null);
  const [signTokenExpiresAt, setSignTokenExpiresAt] = useState<string | null>(null);
  const [reauthLoading, setReauthLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const loadContract = useCallback(async () => {
    if (!contractId) {
      setLoading(false);
      setErrorCode('CONTRACT_NOT_FOUND');
      return;
    }
    setLoading(true);
    setErrorCode(null);
    try {
      const loaded = await apiClient.getContract(contractId);
      setDetail(loaded);
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      setErrorCode(e?.code ?? 'CONTRACT_NOT_FOUND');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  const handleOpenPdf = async () => {
    if (!contractId) return;
    setPdfLoading(true);
    try {
      const fileUri = await apiClient.downloadContractFinalPdf(contractId);
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(fileUri);
        await Linking.openURL(contentUri);
      } else {
        await Linking.openURL(fileUri);
      }
    } catch (err: unknown) {
      const e = err as Error & { code?: string; status?: number };
      const code = e?.code;
      let title = 'PDF 열람 실패';
      let message: string;
      if (code === PDF_AUTH_EXPIRED || e?.status === 401) {
        title = '인증 만료';
        message = getContractErrorMessage(PDF_AUTH_EXPIRED);
      } else if (code === PDF_ACCESS_DENIED || e?.status === 403) {
        title = '접근 불가';
        message = getContractErrorMessage(PDF_ACCESS_DENIED);
      } else if (e?.status === 404) {
        message = getContractErrorMessage('CONTRACT_NOT_FOUND');
      } else if (code === PDF_NOT_READY || e?.status === 409) {
        title = 'PDF 준비 중';
        message = getContractErrorMessage(PDF_NOT_READY);
      } else {
        message = getContractErrorMessage(code);
      }
      Alert.alert(title, message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleRegeneratePdf = async () => {
    if (!contractId) return;
    setRegenerating(true);
    try {
      const updated = await apiClient.regenerateContractFinalPdf(contractId);
      setDetail(updated);
      Alert.alert('재생성 요청 완료', 'PDF 생성이 시작되었습니다. 잠시 후 다시 확인해주세요.');
    } catch {
      Alert.alert('재생성 실패', 'PDF 재생성 요청에 실패했습니다.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleOpenSign = async () => {
    if (!contractId) return;
    setConsentGiven(false);
    setSubmitError(null);
    setSubmitErrorCode(null);
    setReauthLoading(true);
    try {
      const { signToken, expiresAt } = await apiClient.reauthContract(contractId);
      setSignToken(signToken);
      setSignTokenExpiresAt(expiresAt);
      setSignModalVisible(true);
    } catch (err: unknown) {
      const e = err as Error & { code?: string; status?: number };
      Alert.alert('서명 준비 실패', getContractErrorMessage(e?.code, e?.status));
    } finally {
      setReauthLoading(false);
    }
  };

  const handleRetryReauth = async () => {
    if (!contractId) return;
    setReauthLoading(true);
    try {
      const { signToken, expiresAt } = await apiClient.reauthContract(contractId);
      setSignToken(signToken);
      setSignTokenExpiresAt(expiresAt);
      setSubmitError(null);
      setSubmitErrorCode(null);
    } catch (err: unknown) {
      const e = err as Error & { code?: string; status?: number };
      setSubmitError(getContractErrorMessage(e?.code, e?.status));
      setSubmitErrorCode(e?.code ?? null);
    } finally {
      setReauthLoading(false);
    }
  };

  const handleSubmitSign = async () => {
    if (!contractId || !signToken) return;
    if (!consentGiven) {
      setSubmitError(getContractErrorMessage('CONSENT_REQUIRED'));
      setSubmitErrorCode('CONSENT_REQUIRED');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitErrorCode(null);
    try {
      const updated = await apiClient.signContract(contractId, {
        consentGiven: true,
        consentTextVersion,
        signToken,
      });
      setDetail(updated);
      // 이슈 #149: 서명 후 계약 목록 캐시 invalidate → 백엔드에서 최신 상태 재조회
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts });
      setSignModalVisible(false);
      setSignToken(null);
      setSignTokenExpiresAt(null);
      Alert.alert('서명 완료', '계약서에 서명이 반영되었습니다.');
    } catch (err: unknown) {
      const e = err as Error & { code?: string; status?: number };
      setSubmitErrorCode(e?.code ?? null);
      setSubmitError(getContractErrorMessage(e?.code, e?.status));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.brandInk} />
        <Text style={styles.loadingText}>계약서 불러오는 중...</Text>
      </View>
    );
  }

  if (errorCode || !detail) {
    const message = getContractErrorMessage(errorCode ?? undefined);
    const idInfo = contractId ? `\n(ID: ${contractId})` : '';
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {message}
          {idInfo}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>목록으로</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 방어 코드: 런타임에서 contract 필드가 누락된 경우를 대비
  if (!detail.contract) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{getContractErrorMessage('CONTRACT_NOT_FOUND')}</Text>
      </View>
    );
  }

  const { contract, currentVersion, signatures } = detail;
  const sections = parseContentJson(currentVersion?.contentJson);
  const canSign = contract.status === 'SENT';

  const statusLabel =
    contract.status === 'FULLY_SIGNED'
      ? '체결 완료'
      : contract.status === 'SENT'
        ? '서명 대기'
        : contract.status === 'INSTRUCTOR_SIGNED'
          ? '강사 서명 완료'
          : contract.status === 'VOID'
            ? '취소'
            : contract.status;

  const statusBadgeColor =
    contract.status === 'FULLY_SIGNED' ? '#10B981'
      : contract.status === 'SENT' ? '#F59E0B'
        : contract.status === 'INSTRUCTOR_SIGNED' ? '#3B82F6'
          : contract.status === 'VOID' ? '#9CA3AF'
            : Colors.mutedForeground;

  const period =
    contract.effectiveFrom && contract.effectiveTo
      ? `${contract.effectiveFrom.slice(0, 10)} ~ ${contract.effectiveTo.slice(0, 10)}`
      : '';

  const hasEvidenceInfo = currentVersion && (currentVersion.documentHashSha256 || currentVersion.documentFileKey);

  return (
    <>
      <ScrollView style={styles.container}>
        {/* ── 헤더 카드: 제목·상태·기간 ── */}
        <View style={styles.headerCard}>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor }]}>
              <Text style={styles.statusBadgeText}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.title}>{contract.title?.trim() || '제목 없음'}</Text>
          {period ? (
            <Text style={styles.periodText}>📅 계약기간: {period}</Text>
          ) : null}
        </View>

        {/* ── 계약 본문 섹션 (contentJson.sections) ── */}
        {sections.length > 0 && (
          <View style={styles.contentCard}>
            {sections.map((sec, i) => (
              <View key={i} style={[styles.section, i < sections.length - 1 && styles.sectionDivider]}>
                <Text style={styles.sectionTitle}>{sec.title}</Text>
                <Text style={styles.paragraph}>{sec.content}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── 서명 현황 ── */}
        {signatures.length > 0 && (
          <View style={styles.contentCard}>
            <Text style={styles.cardLabel}>서명 현황</Text>
            {signatures.map((sig, i) => (
              <View key={i} style={styles.signatureRow}>
                <View style={styles.signatureIconDot} />
                <Text style={styles.signatureText}>
                  {sig.signerRole === 'INSTRUCTOR' ? '강사' : '관리자'} 서명 완료
                </Text>
                <Text style={styles.signatureDate}>{sig.signedAt.slice(0, 10)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── PDF / 서명 버튼 ── */}
        <View style={styles.actionCard}>
          {contract.status === 'FULLY_SIGNED' && (
            contract.pdfGenerationStatus === 'READY' ? (
              <TouchableOpacity
                style={[styles.pdfButton, pdfLoading && styles.pdfButtonDisabled]}
                onPress={handleOpenPdf}
                disabled={pdfLoading}
              >
                {pdfLoading ? (
                  <ActivityIndicator size="small" color={Colors.brandInk} />
                ) : (
                  <Text style={styles.pdfButtonText}>계약서 보기</Text>
                )}
              </TouchableOpacity>
            ) : contract.pdfGenerationStatus === 'PENDING' || contract.pdfGenerationStatus === 'GENERATING' ? (
              <View style={styles.pdfStatusRow}>
                <ActivityIndicator size="small" color={Colors.brandHoney} />
                <Text style={styles.pdfStatusText}>PDF 생성 중...</Text>
              </View>
            ) : contract.pdfGenerationStatus === 'FAILED' ? (
              <View>
                <Text style={styles.pdfErrorText}>PDF 생성에 실패했습니다.</Text>
                <TouchableOpacity
                  style={[styles.pdfRegenerateButton, regenerating && styles.pdfButtonDisabled]}
                  onPress={handleRegeneratePdf}
                  disabled={regenerating}
                >
                  <Text style={styles.pdfRegenerateText}>
                    {regenerating ? '재생성 중...' : '다시 생성하기'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.pdfStatusText}>PDF가 아직 생성되지 않았습니다.</Text>
            )
          )}

          {canSign && (
            <TouchableOpacity
              style={styles.signButton}
              onPress={handleOpenSign}
              disabled={reauthLoading}
            >
              {reauthLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.signButtonText}>서명하기</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── 증빙 정보 (보조 / 하단) ── */}
        {hasEvidenceInfo && (
          <View style={styles.evidenceCard}>
            <Text style={styles.evidenceLabel}>증빙 정보</Text>
            {currentVersion!.documentHashSha256 ? (
              <Text style={styles.evidenceText} numberOfLines={1} ellipsizeMode="middle">
                해시: {currentVersion!.documentHashSha256}
              </Text>
            ) : null}
            {currentVersion!.documentFileKey ? (
              <Text style={styles.evidenceText} numberOfLines={1} ellipsizeMode="middle">
                파일: {currentVersion!.documentFileKey}
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal visible={signModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>계약 서명</Text>
            <Text style={styles.consentIntro}>
              아래 동의 내용을 확인하고 체크한 후 서명을 진행해 주세요.
            </Text>
            {signTokenExpiresAt ? (
              <Text style={styles.tokenExpireText}>
                서명 세션 만료 시각: {new Date(signTokenExpiresAt).toLocaleString()}
              </Text>
            ) : null}
            <Text style={styles.consentText}>
              본인은 위 계약 내용을 확인하였으며, 이에 동의하여 전자 서명합니다. (동의문 버전: {consentTextVersion})
            </Text>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setConsentGiven((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, consentGiven && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>동의합니다.</Text>
            </TouchableOpacity>
            {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
            {submitErrorCode === SIGN_TOKEN_EXPIRED && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetryReauth}
                disabled={reauthLoading || submitting}
              >
                <Text style={styles.retryButtonText}>
                  {reauthLoading ? '다시 인증 중...' : '다시 인증하기'}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSignModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitSign}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>서명 제출</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 20 },
  loadingText: { marginTop: 8, fontSize: 13, color: Colors.mutedForeground },
  errorText: { fontSize: 15, color: Colors.colorError, textAlign: 'center' },
  backButton: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: Colors.surfaceSoft, alignSelf: 'center' },
  backButtonText: { fontSize: 15, fontWeight: '600', color: Colors.brandInk },

  // 헤더 카드 (제목·상태·기간)
  headerCard: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  statusBadgeRow: { flexDirection: 'row', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.4 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.brandInk, marginBottom: 6, lineHeight: 30 },
  periodText: { fontSize: 13, color: Colors.mutedForeground },

  // 계약 본문 카드
  contentCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  cardLabel: { fontSize: 13, fontWeight: '700', color: Colors.brandInk, marginBottom: 12, letterSpacing: 0.3 },
  section: { paddingVertical: 12 },
  sectionDivider: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.brandInk, marginBottom: 6 },
  paragraph: { fontSize: 13, color: '#4B5563', lineHeight: 21 },

  // 서명 현황
  signatureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  signatureIconDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 10 },
  signatureText: { flex: 1, fontSize: 13, color: '#374151' },
  signatureDate: { fontSize: 12, color: Colors.mutedForeground },

  // 액션 카드 (PDF / 서명)
  actionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  signButton: { backgroundColor: Colors.brandInk, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  signButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  pdfButton: { backgroundColor: Colors.brandHoney, paddingVertical: 13, borderRadius: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  pdfButtonDisabled: { opacity: 0.6 },
  pdfButtonText: { color: Colors.brandInk, fontWeight: '700', fontSize: 14 },
  pdfStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  pdfStatusText: { fontSize: 13, color: Colors.mutedForeground },
  pdfErrorText: { fontSize: 13, color: Colors.colorError, marginBottom: 8 },
  pdfRegenerateButton: { backgroundColor: Colors.surfaceSoft, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.brandInk },
  pdfRegenerateText: { fontSize: 13, color: Colors.brandInk, fontWeight: '600' },

  // 증빙 정보 (보조 / 하단 축소)
  evidenceCard: {
    marginHorizontal: 16,
    marginBottom: 40,
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  evidenceLabel: { fontSize: 11, fontWeight: '600', color: Colors.mutedForeground, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  evidenceText: { fontSize: 11, color: '#9CA3AF', lineHeight: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(37,27,16,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: 'white', borderRadius: 16, padding: 24, ...Shadows.card },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.brandInk, marginBottom: 12 },
  consentIntro: { fontSize: 13, color: Colors.mutedForeground, marginBottom: 8 },
  tokenExpireText: { fontSize: 11, color: Colors.mutedForeground, marginBottom: 4 },
  consentText: { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#9CA3AF', borderRadius: 4, marginRight: 10 },
  checkboxChecked: { backgroundColor: Colors.brandInk, borderColor: Colors.brandInk },
  checkLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },
  submitError: { fontSize: 13, color: Colors.colorError, marginBottom: 12 },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.brandInk,
    marginBottom: 8,
  },
  retryButtonText: { fontSize: 12, color: Colors.brandInk, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.surfaceSoft, alignItems: 'center' },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: Colors.brandInk },
  submitButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.brandInk, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  submitButtonText: { fontSize: 15, fontWeight: '600', color: 'white' },
});
