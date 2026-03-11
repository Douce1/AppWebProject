import { Colors, Shadows } from '@/constants/theme';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getContractErrorMessage, SIGN_TOKEN_EXPIRED } from '../api/contractErrors';
import { useContractDetailQuery, useReauthContractMutation, useSignContractMutation } from '../query/hooks';

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

  const [signModalVisible, setSignModalVisible] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentTextVersion] = useState('1.0');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null);
  const [signToken, setSignToken] = useState<string | null>(null);
  const [signTokenExpiresAt, setSignTokenExpiresAt] = useState<string | null>(null);
  const contractDetailQuery = useContractDetailQuery(contractId);
  const reauthContractMutation = useReauthContractMutation();
  const signContractMutation = useSignContractMutation(contractId);
  const detail = contractDetailQuery.data ?? null;
  const loading = contractDetailQuery.isLoading || contractDetailQuery.isFetching;
  const errorCode = contractDetailQuery.isError
    ? ((contractDetailQuery.error as Error & { code?: string })?.code ?? 'CONTRACT_NOT_FOUND')
    : null;
  const reauthLoading = reauthContractMutation.isPending;
  const submitting = signContractMutation.isPending;

  const handleOpenSign = async () => {
    if (!contractId) return;
    setConsentGiven(false);
    setSubmitError(null);
    setSubmitErrorCode(null);
    try {
      const { signToken, expiresAt } = await reauthContractMutation.mutateAsync(contractId);
      setSignToken(signToken);
      setSignTokenExpiresAt(expiresAt);
      setSignModalVisible(true);
    } catch (err: unknown) {
      const e = err as Error & { code?: string; status?: number };
      Alert.alert('서명 준비 실패', getContractErrorMessage(e?.code, e?.status));
    }
  };

  const handleRetryReauth = async () => {
    if (!contractId) return;
    try {
      const { signToken, expiresAt } = await reauthContractMutation.mutateAsync(contractId);
      setSignToken(signToken);
      setSignTokenExpiresAt(expiresAt);
      setSubmitError(null);
      setSubmitErrorCode(null);
    } catch (err: unknown) {
      const e = err as Error & { code?: string; status?: number };
      setSubmitError(getContractErrorMessage(e?.code, e?.status));
      setSubmitErrorCode(e?.code ?? null);
    }
  };

  const handleSubmitSign = async () => {
    if (!contractId || !signToken) return;
    if (!consentGiven) {
      setSubmitError(getContractErrorMessage('CONSENT_REQUIRED'));
      setSubmitErrorCode('CONSENT_REQUIRED');
      return;
    }
    setSubmitError(null);
    setSubmitErrorCode(null);
    try {
      await signContractMutation.mutateAsync({
        consentGiven: true,
        consentTextVersion,
        signToken,
      });
      setDetail(updated);
      setSignModalVisible(false);
      setSignToken(null);
      setSignTokenExpiresAt(null);
      Alert.alert('서명 완료', '계약서에 서명이 반영되었습니다.');
    } catch (err: unknown) {
      const e = err as Error & { code?: string; status?: number };
      setSubmitErrorCode(e?.code ?? null);
      setSubmitError(getContractErrorMessage(e?.code, e?.status));
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

  const period =
    contract.effectiveFrom && contract.effectiveTo
      ? `${contract.effectiveFrom.slice(0, 10)} ~ ${contract.effectiveTo.slice(0, 10)}`
      : '';

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{contract.title?.trim() || '제목 없음'}</Text>
          <Text style={styles.subTitle}>
            {period ? `계약기간: ${period}` : ''}
            {period ? ' · ' : ''}
            {statusLabel}
          </Text>

          {sections.map((sec, i) => (
            <View key={i} style={styles.section}>
              <Text style={styles.sectionTitle}>{sec.title}</Text>
              <Text style={styles.paragraph}>{sec.content}</Text>
            </View>
          ))}

          {currentVersion && (currentVersion.documentHashSha256 || currentVersion.documentFileKey) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>증빙 정보</Text>
              {currentVersion.documentHashSha256 ? (
                <Text style={styles.paragraph}>문서 해시: {currentVersion.documentHashSha256}</Text>
              ) : null}
              {currentVersion.documentFileKey ? (
                <Text style={styles.paragraph}>문서 파일: {currentVersion.documentFileKey}</Text>
              ) : null}
            </View>
          )}

          {signatures.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>서명 현황</Text>
              {signatures.map((sig, i) => (
                <Text key={i} style={styles.paragraph}>
                  {sig.signerRole === 'INSTRUCTOR' ? '강사' : '관리자'}: {sig.signedAt.slice(0, 10)} 서명 완료
                </Text>
              ))}
            </View>
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
  container: { flex: 1, backgroundColor: Colors.background, paddingVertical: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 20 },
  loadingText: { marginTop: 8, fontSize: 13, color: Colors.mutedForeground },
  errorText: { fontSize: 15, color: Colors.colorError, textAlign: 'center' },
  backButton: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: Colors.surfaceSoft, alignSelf: 'center' },
  backButtonText: { fontSize: 15, fontWeight: '600', color: Colors.brandInk },
  card: {
    marginHorizontal: 16,
    marginBottom: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 3,
    gap: 24,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.brandInk, marginBottom: 4 },
  subTitle: { fontSize: 14, color: Colors.mutedForeground, marginBottom: 16 },
  section: {
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 8,
    padding: 16,
    justifyContent: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.brandInk, marginBottom: 8 },
  paragraph: { fontSize: 13, color: Colors.mutedForeground, lineHeight: 20, marginBottom: 4 },
  signButton: { marginTop: 20, backgroundColor: Colors.brandInk, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  signButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

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
