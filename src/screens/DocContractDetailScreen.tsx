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
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { apiClient } from '../api/apiClient';
import { getContractErrorMessage } from '../api/contractErrors';
import type { ApiContractDetail } from '../api/types';

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
  const contractId = typeof params.contractId === 'string' ? params.contractId : Array.isArray(params.contractId) ? params.contractId[0] : undefined;

  const [detail, setDetail] = useState<ApiContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [signModalVisible, setSignModalVisible] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentTextVersion] = useState('1.0');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadContract = useCallback(async () => {
    if (!contractId) {
      setLoading(false);
      setErrorCode('CONTRACT_NOT_FOUND');
      return;
    }
    setLoading(true);
    setErrorCode(null);
    try {
      const d = await apiClient.getContract(contractId);
      setDetail(d);
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

  const handleOpenSign = () => {
    setConsentGiven(false);
    setSubmitError(null);
    setSignModalVisible(true);
  };

  const handleSubmitSign = async () => {
    if (!contractId || !detail?.signTokenId) return;
    if (!consentGiven) {
      setSubmitError(getContractErrorMessage('CONSENT_REQUIRED'));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await apiClient.submitContractSignature(contractId, {
        consentGiven: true,
        consentTextVersion,
        signTokenId: detail.signTokenId!,
      });
      setDetail(updated);
      setSignModalVisible(false);
      Alert.alert('서명 완료', '계약서에 서명이 반영되었습니다.');
    } catch (err: unknown) {
      const e = err as Error & { code?: string; status?: number };
      setSubmitError(getContractErrorMessage(e?.code, e?.status));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>계약서 불러오는 중...</Text>
      </View>
    );
  }

  if (errorCode || !detail) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{getContractErrorMessage(errorCode ?? undefined)}</Text>
      </View>
    );
  }

  const { contract, currentVersion, signatures, signTokenId } = detail;
  const sections = parseContentJson(currentVersion?.contentJson);
  const canSign = contract.status === 'SENT' && signTokenId;

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
          <Text style={styles.title}>{contract.title ?? `계약 ${contract.contractId}`}</Text>
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
            <TouchableOpacity style={styles.signButton} onPress={handleOpenSign}>
              <Text style={styles.signButtonText}>서명하기</Text>
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
            <Text style={styles.consentText}>
              본인은 위 계약 내용을 확인하였으며, 이에 동의하여 전자 서명합니다. (동의문 버전: {consentTextVersion})
            </Text>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setConsentGiven((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, consentGiven && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>동의합니다</Text>
            </TouchableOpacity>
            {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
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
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7fa', padding: 20 },
  loadingText: { marginTop: 8, fontSize: 13, color: '#6B7280' },
  errorText: { fontSize: 15, color: '#DC2626', textAlign: 'center' },
  card: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subTitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 6 },
  paragraph: { fontSize: 13, color: '#4B5563', lineHeight: 20, marginBottom: 4 },
  signButton: { marginTop: 20, backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  signButtonText: { color: 'white', fontWeight: '700', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: 'white', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  consentIntro: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  consentText: { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#9CA3AF', borderRadius: 4, marginRight: 10 },
  checkboxChecked: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  checkLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },
  submitError: { fontSize: 13, color: '#DC2626', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
  submitButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  submitButtonText: { fontSize: 15, fontWeight: '600', color: 'white' },
});
