import { Colors, Shadows } from '@/constants/theme';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ApiLessonRequest } from '../api/types';
import { formatLessonCardLocation } from '../utils/lessonCardLocation';
import { useLessonRequestsQuery, useRespondToRequestMutation } from '../query/hooks';

function formatLessonSchedule(req: ApiLessonRequest): string {
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

  if (!end || Number.isNaN(end.getTime())) return `${date} ${startTime}`;

  const endTime = new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(end);

  return `${date} ${startTime} - ${endTime}`;
}

function formatLessonLocation(req: ApiLessonRequest): string {
  const loc = formatLessonCardLocation({
    region: req.region ?? '',
    museum: req.museum,
    venueName: req.venueName,
  });
  return loc || '장소 정보 없음';
}

function lessonRequestStatusLabel(status: ApiLessonRequest['status']): string {
  if (status === 'PENDING') return '미응답';
  if (status === 'ACCEPTED') return '수락됨';
  if (status === 'REJECTED') return '거절됨';
  return '취소됨';
}

export default function DocLessonRequestDetailScreen() {
  const params = useLocalSearchParams<{ requestId?: string | string[] }>();
  const router = useRouter();
  const requestId = typeof params.requestId === 'string'
    ? params.requestId
    : Array.isArray(params.requestId)
      ? params.requestId[0]
      : undefined;

  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const lessonRequestsQuery = useLessonRequestsQuery();
  const respondToRequestMutation = useRespondToRequestMutation();
  const request = useMemo(
    () => (lessonRequestsQuery.data ?? []).find((item) => item.requestId === requestId) ?? null,
    [lessonRequestsQuery.data, requestId],
  );
  const loading = lessonRequestsQuery.isLoading || lessonRequestsQuery.isFetching;
  const error = lessonRequestsQuery.isError ? '요청 정보를 불러오지 못했습니다.' : null;
  const submitting = respondToRequestMutation.isPending;

  const handleRespond = async (action: 'ACCEPT' | 'REJECT') => {
    if (!request || submitting) return;
    try {
      await respondToRequestMutation.mutateAsync({
        requestId: request.requestId,
        action,
        rejectionReason: action === 'REJECT' ? rejectReason.trim() || undefined : undefined,
      });
      setRejectMode(false);
      setRejectReason('');
      if (action === 'ACCEPT') {
        Alert.alert(
          '수락 완료',
          '요청을 수락하여 새로운 계약서가 발송되었습니다.',
          [{
            text: '계약 확인하기',
            onPress: () => router.replace({
              pathname: '/(tabs)/docs',
              params: { targetTab: '계약' },
            }),
          }],
        );
      }
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string };
      const message = e.status === 409 ? '이미 응답이 완료된 요청입니다.' : (e.message ?? '요청 처리 중 오류가 발생했습니다.');
      Alert.alert('처리 실패', message);
    }
  };

  const requestedAtText = useMemo(() => {
    if (!request?.requestedAt) return '-';
    const date = new Date(request.requestedAt);
    if (Number.isNaN(date.getTime())) return request.requestedAt;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }, [request?.requestedAt]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.brandInk} />
        <Text style={styles.loadingText}>요청 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (error || !request) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? '요청 정보를 찾을 수 없습니다.'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>목록으로</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPending = request.status === 'PENDING';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{request.lessonTitle?.trim() || '수업명 미정'}</Text>
          <View style={[styles.statusBadge, isPending && styles.pendingStatusBadge]}>
            <Text style={[styles.statusBadgeText, isPending && styles.pendingStatusBadgeText]}>
              {lessonRequestStatusLabel(request.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.primaryMeta}>{formatLessonSchedule(request)}</Text>
        <Text style={styles.secondaryMeta}>{formatLessonLocation(request)}</Text>

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>요청 정보</Text>
          <Text style={styles.detailLine}>요청일: {requestedAtText}</Text>
          <Text style={styles.detailLine}>요청 ID: {request.requestId}</Text>
          <Text style={styles.detailLine}>수업 ID: {request.lessonId}</Text>
        </View>

        {request.rejectionReason ? (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>거절 사유</Text>
            <Text style={styles.detailLine}>{request.rejectionReason}</Text>
          </View>
        ) : null}

        {isPending ? (
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.acceptButton, submitting && styles.disabledButton]}
                onPress={() => handleRespond('ACCEPT')}
                disabled={submitting}
              >
                <Text style={styles.acceptButtonText}>{submitting ? '처리 중...' : '수락'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectButton, submitting && styles.disabledButton]}
                onPress={() => setRejectMode((prev) => !prev)}
                disabled={submitting}
              >
                <Text style={styles.rejectButtonText}>거절</Text>
              </TouchableOpacity>
            </View>

            {rejectMode ? (
              <View style={styles.rejectSection}>
                <TextInput
                  style={styles.rejectInput}
                  placeholder="거절 사유를 입력해주세요... (선택 사항)"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.submitRejectButton, submitting && styles.disabledButton]}
                  onPress={() => handleRespond('REJECT')}
                  disabled={submitting}
                >
                  <Text style={styles.submitRejectButtonText}>거절 완료</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.background },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  errorText: { fontSize: 14, color: '#B42318', textAlign: 'center' },
  backButton: { marginTop: 16, backgroundColor: Colors.brandInk, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  backButtonText: { color: Colors.brandHoney, fontWeight: '700' },
  card: { margin: 16, padding: 18, borderRadius: 16, backgroundColor: 'white', ...Shadows.card },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontSize: 20, lineHeight: 28, fontWeight: '700', color: '#111827' },
  statusBadge: { backgroundColor: Colors.surfaceSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pendingStatusBadge: { backgroundColor: '#FFF7E8' },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.brandInk },
  pendingStatusBadgeText: { color: '#B45309' },
  primaryMeta: { marginTop: 14, fontSize: 15, fontWeight: '600', color: '#374151' },
  secondaryMeta: { marginTop: 6, fontSize: 14, color: '#6B7280' },
  detailSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  detailSectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 },
  detailLine: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  actionRow: { flexDirection: 'row', marginTop: 20 },
  acceptButton: { flex: 1, backgroundColor: '#F3C742', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginRight: 8 },
  acceptButtonText: { color: '#251B10', fontWeight: '700', fontSize: 14 },
  rejectButton: { flex: 1, backgroundColor: '#F2B8B5', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginLeft: 8 },
  rejectButtonText: { color: '#B42318', fontWeight: '700', fontSize: 14 },
  disabledButton: { opacity: 0.6 },
  rejectSection: { marginTop: 12 },
  rejectInput: { backgroundColor: Colors.surfaceSoft, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', padding: 12, minHeight: 80, fontSize: 13 },
  submitRejectButton: { marginTop: 10, backgroundColor: Colors.brandInk, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitRejectButtonText: { color: Colors.brandHoney, fontWeight: '700', fontSize: 14 },
});
