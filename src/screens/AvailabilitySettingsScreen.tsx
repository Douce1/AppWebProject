import { Colors, Radius, Shadows } from '@/constants/theme';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { AlertTriangle, CheckCircle2, Plus, XCircle } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { apiClient } from '../api/apiClient';
import type { ApiMonthSubmission } from '../api/types';

export type TimeSlot = { start: string; end: string };
type AvailabilityMap = Record<string, TimeSlot[]>; // key: YYYY-MM-DD

type Marking = {
  selected?: boolean;
  selectedColor?: string;
  selectedTextColor?: string;
  marked?: boolean;
  dotColor?: string;
};
type MarkedDates = Record<string, Marking>;

const SAMPLE_AVAILABILITY: AvailabilityMap = {};

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toYearMonth(dateString: string): string {
  return dateString.slice(0, 7); // "YYYY-MM-DD" → "YYYY-MM"
}

export function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `${year}년 ${parseInt(m, 10)}월`;
}

function getDatesInRange(start: string, end: string): string[] {
  const result: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  const step = startDate <= endDate ? 1 : -1;
  const current = new Date(startDate);

  while ((step === 1 && current <= endDate) || (step === -1 && current >= endDate)) {
    result.push(formatDate(current));
    current.setDate(current.getDate() + step);
  }

  return result;
}

export default function AvailabilitySettingsScreen() {
  const today = useMemo(() => new Date(), []);
  const max = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return d;
  }, []);

  const minDate = formatDate(today);
  const maxDate = formatDate(max);
  const initialMonth = toYearMonth(minDate);

  const [viewMonth, setViewMonth] = useState<string>(initialMonth);
  const [availability, setAvailability] = useState<AvailabilityMap>(SAMPLE_AVAILABILITY);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [focusedDate, setFocusedDate] = useState<string>(minDate);
  const [startTimeInput, setStartTimeInput] = useState('09:00');
  const [endTimeInput, setEndTimeInput] = useState('18:00');
  const [rangeText, setRangeText] = useState('');

  // 월별 제출 상태
  const [monthSubmission, setMonthSubmission] = useState<ApiMonthSubmission | null>(null);
  const [monthSubmissionLoading, setMonthSubmissionLoading] = useState(false);
  const [monthSubmissionUpdating, setMonthSubmissionUpdating] = useState(false);

  // 월별 제출 상태 조회
  const loadMonthSubmission = useCallback(async (month: string) => {
    setMonthSubmissionLoading(true);
    try {
      const data = await apiClient.getMonthSubmission(month);
      setMonthSubmission(data);
    } catch {
      // 미제출 상태로 처리
      setMonthSubmission({ month, isUnavailable: false, submittedAt: null });
    } finally {
      setMonthSubmissionLoading(false);
    }
  }, []);

  // 초기 진입 시 기존 가용시간 + 이번 달 제출 상태 불러오기
  useEffect(() => {
    let mounted = true;

    const loadAvailability = async () => {
      try {
        const slots = await apiClient.getAvailability();
        if (!mounted) return;

        const next: AvailabilityMap = {};
        const pad = (n: number) => n.toString().padStart(2, '0');

        slots.forEach((slot) => {
          const start = new Date(slot.availableStartAt);
          const end = new Date(slot.availableEndAt);
          const dateKey = formatDate(start);
          const startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
          const endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
          const list = next[dateKey] ?? [];
          list.push({ start: startStr, end: endStr });
          next[dateKey] = list;
        });

        setAvailability(next);
      } catch (error) {
        if (!mounted) return;
        const status = (error as { status?: number }).status;
        const message =
          status != null
            ? `오류가 발생했습니다. (${status})`
            : '가용시간을 불러오지 못했습니다. 다시 시도해주세요.';
        Alert.alert('불러오기 실패', message);
      }
    };

    void loadAvailability();
    void loadMonthSubmission(initialMonth);

    return () => {
      mounted = false;
    };
  }, [initialMonth, loadMonthSubmission]);

  // 표시 월이 변경될 때마다 제출 상태 재조회
  useEffect(() => {
    void loadMonthSubmission(viewMonth);
  }, [viewMonth, loadMonthSubmission]);

  useEffect(() => {
    if (!selectedDates.length) {
      setRangeText('');
      return;
    }
    const sorted = [...selectedDates].sort();
    const start = sorted[0];
    const end = sorted[sorted.length - 1];
    setRangeText(start === end ? start : `${start} ~ ${end}`);
  }, [selectedDates]);

  // 월 전체 출강 불가 토글
  const handleMonthUnavailableToggle = async () => {
    if (monthSubmissionUpdating) return;
    const next = !(monthSubmission?.isUnavailable ?? false);

    const title = next ? '이번 달 출강 불가 제출' : '출강 불가 취소';
    const message = next
      ? `${formatMonthLabel(viewMonth)}을 출강 불가로 제출하시겠습니까?\n운영팀에게 명시적으로 전달됩니다.`
      : `${formatMonthLabel(viewMonth)} 출강 불가를 취소하시겠습니까?\n다시 출강 가능 상태가 됩니다.`;

    Alert.alert(title, message, [
      { text: '아니오', style: 'cancel' },
      {
        text: '확인',
        style: next ? 'destructive' : 'default',
        onPress: async () => {
          setMonthSubmissionUpdating(true);
          // Optimistic
          const prev = monthSubmission;
          setMonthSubmission((s) =>
            s
              ? { ...s, isUnavailable: next, submittedAt: next ? new Date().toISOString() : null }
              : { month: viewMonth, isUnavailable: next, submittedAt: next ? new Date().toISOString() : null },
          );
          try {
            const updated = await apiClient.updateMonthSubmission(viewMonth, next);
            setMonthSubmission(updated);
            Alert.alert(
              next ? '출강 불가 제출 완료' : '출강 불가 취소 완료',
              next
                ? `${formatMonthLabel(viewMonth)}이 출강 불가로 제출되었습니다.`
                : `${formatMonthLabel(viewMonth)} 출강 불가가 취소되었습니다.`,
            );
          } catch {
            // 롤백
            setMonthSubmission(prev);
            Alert.alert('저장 실패', '월별 출강 상태 변경에 실패했습니다. 다시 시도해주세요.');
          } finally {
            setMonthSubmissionUpdating(false);
          }
        },
      },
    ]);
  };

  const markedDates: MarkedDates = useMemo(() => {
    const marked: MarkedDates = {};

    Object.keys(availability).forEach((date) => {
      const hasSlots = availability[date] && availability[date].length > 0;
      if (!hasSlots) return;
      marked[date] = {
        selected: true,
        selectedColor: '#FFF0C2',
        selectedTextColor: Colors.brandInk,
        marked: true,
        dotColor: Colors.brandHoney,
      };
    });

    selectedDates.forEach((date) => {
      const hasSlots = availability[date] && availability[date].length > 0;
      marked[date] = {
        selected: true,
        selectedColor: Colors.brandHoney,
        selectedTextColor: Colors.brandInk,
        marked: hasSlots || marked[date]?.marked,
        dotColor: Colors.brandHoney,
      };
    });

    return marked;
  }, [selectedDates, availability]);

  const handleDayPress = (day: { dateString: string }) => {
    const date = day.dateString;
    setFocusedDate(date);
    const hasSlots = availability[date] && availability[date].length > 0;

    if (!rangeStart) {
      if (hasSlots) {
        const firstSlot = availability[date][0];
        setStartTimeInput(firstSlot.start);
        setEndTimeInput(firstSlot.end);
      }
      if (selectedDates.length === 1 && selectedDates[0] === date) {
        setSelectedDates([]);
        return;
      }
      setRangeStart(date);
      setSelectedDates([date]);
      return;
    }

    if (rangeStart === date) {
      setRangeStart(null);
      setSelectedDates([]);
      return;
    }

    const range = getDatesInRange(rangeStart, date);
    setSelectedDates(range);
    setRangeStart(null);
  };

  const toIso = (date: string, time: string): string => {
    const [hh, mm] = time.split(':').map((v) => Number(v));
    const d = new Date(`${date}T00:00:00`);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  };

  const buildPayloadSlots = (map: AvailabilityMap) =>
    Object.entries(map).flatMap(([date, slots]) =>
      (slots ?? []).map((slot) => ({
        availableStartAt: toIso(date, slot.start),
        availableEndAt: toIso(date, slot.end),
      })),
    );

  const applyTimeToSelectedDates = async () => {
    if (!selectedDates.length) {
      Alert.alert('알림', '가능시간을 적용할 날짜를 먼저 선택해주세요.');
      return;
    }

    const next: AvailabilityMap = { ...availability };
    selectedDates.forEach((date) => {
      next[date] = [{ start: startTimeInput, end: endTimeInput }];
    });
    setAvailability(next);

    const payloadSlots = buildPayloadSlots(next);
    try {
      await apiClient.upsertAvailability({ slots: payloadSlots });
      Alert.alert('등록 완료', '선택한 날짜의 가능시간이 저장되었습니다.');
    } catch {
      Alert.alert('저장 실패', '가용시간 저장 중 오류가 발생했습니다.');
    }

    setSelectedDates([]);
    setRangeStart(null);
    setRangeText('');
  };

  const currentSlots: TimeSlot[] = availability[focusedDate] ?? [];
  const canApply = selectedDates.length > 0;
  const hasSelection = selectedDates.length > 0 || !!rangeText;
  const hasConfiguredInSelection = selectedDates.some(
    (date) => availability[date] && availability[date].length > 0,
  );
  const isUnavailable = monthSubmission?.isUnavailable ?? false;

  const allConfiguredSlots = useMemo(
    () =>
      Object.entries(availability)
        .filter(([, slots]) => slots && slots.length > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .flatMap(([date, slots]) =>
          (slots ?? []).map((slot) => ({
            date,
            start: slot.start,
            end: slot.end,
          })),
        ),
    [availability],
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <KeyboardAwareScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={40}
      >
        {/* ── 월별 출강 상태 배너 ── */}
        <View style={styles.section}>
          <View style={styles.monthBannerHeader}>
            <Text style={styles.sectionTitle}>
              월별 출강 상태
            </Text>
            <Text style={styles.monthLabel}>{formatMonthLabel(viewMonth)}</Text>
          </View>

          {monthSubmissionLoading ? (
            <ActivityIndicator color={Colors.brandInk} style={{ marginVertical: 12 }} />
          ) : (
            <>
              <View
                style={[
                  styles.statusBadge,
                  isUnavailable ? styles.statusBadgeUnavailable : styles.statusBadgeAvailable,
                ]}
              >
                {isUnavailable ? (
                  <XCircle size={16} color="#DC2626" style={{ marginRight: 6 }} />
                ) : (
                  <CheckCircle2 size={16} color="#059669" style={{ marginRight: 6 }} />
                )}
                <Text
                  style={[
                    styles.statusBadgeText,
                    isUnavailable ? styles.statusBadgeTextUnavailable : styles.statusBadgeTextAvailable,
                  ]}
                >
                  {isUnavailable
                    ? '출강 불가 제출됨'
                    : monthSubmission?.submittedAt == null
                    ? '미제출 (출강 가능)'
                    : '출강 가능'}
                </Text>
              </View>

              {isUnavailable && (
                <View style={styles.warningRow}>
                  <AlertTriangle size={14} color="#B45309" style={{ marginRight: 6 }} />
                  <Text style={styles.warningText}>
                    출강 불가 상태에서는 slot을 등록해도 운영팀에게 불가로 표시됩니다.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.unavailableButton,
                  isUnavailable ? styles.unavailableButtonCancel : styles.unavailableButtonSubmit,
                  monthSubmissionUpdating && styles.unavailableButtonDisabled,
                ]}
                onPress={handleMonthUnavailableToggle}
                disabled={monthSubmissionUpdating}
              >
                {monthSubmissionUpdating ? (
                  <ActivityIndicator size="small" color={isUnavailable ? '#DC2626' : Colors.brandInk} />
                ) : (
                  <Text
                    style={[
                      styles.unavailableButtonText,
                      isUnavailable ? styles.unavailableButtonTextCancel : styles.unavailableButtonTextSubmit,
                    ]}
                  >
                    {isUnavailable
                      ? `${formatMonthLabel(viewMonth)} 출강 불가 취소`
                      : `${formatMonthLabel(viewMonth)} 출강 불가로 제출`}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── 기존 캘린더 섹션 ── */}
        <View style={styles.section}>
          {isUnavailable && (
            <View style={styles.calendarWarningBanner}>
              <AlertTriangle size={14} color="#92400E" style={{ marginRight: 6 }} />
              <Text style={styles.calendarWarningText}>
                출강 불가 상태입니다. 해제 후 slot을 등록해주세요.
              </Text>
            </View>
          )}
          <Text style={styles.sectionTitle}>가능 날짜 선택 (오늘 ~ 2개월)</Text>
          <Calendar
            minDate={minDate}
            maxDate={maxDate}
            markedDates={markedDates}
            onDayPress={handleDayPress}
            onMonthChange={(month: { dateString: string }) => {
              setViewMonth(toYearMonth(month.dateString));
            }}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.timeHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>가능시간 일괄 설정</Text>
              <Text style={styles.rangeText}>
                {rangeText || '선택한 기간이 없습니다.'}
              </Text>
            </View>
            {canApply && (
              <Text style={styles.activeHint}>{selectedDates.length}개 날짜 설정 중</Text>
            )}
          </View>
          <View style={styles.slotRow}>
            <TextInput
              style={styles.timeInput}
              value={startTimeInput}
              onChangeText={setStartTimeInput}
              placeholder="09:00"
              placeholderTextColor={Colors.mutedForeground}
              editable={!isUnavailable}
            />
            <Text style={styles.slotDash}>~</Text>
            <TextInput
              style={styles.timeInput}
              value={endTimeInput}
              onChangeText={setEndTimeInput}
              placeholder="18:00"
              placeholderTextColor={Colors.mutedForeground}
              editable={!isUnavailable}
            />
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.deleteButton, !hasConfiguredInSelection && styles.deleteButtonDisabled]}
              onPress={() => {
                if (!hasConfiguredInSelection) return;
                Alert.alert(
                  '가능시간 삭제',
                  '선택한 날짜의 가능시간을 모두 삭제하시겠습니까?',
                  [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '확인',
                      style: 'destructive',
                      onPress: async () => {
                        const next: AvailabilityMap = { ...availability };
                        selectedDates.forEach((date) => {
                          if (next[date]) delete next[date];
                        });
                        setAvailability(next);
                        setSelectedDates([]);
                        setRangeStart(null);
                        setRangeText('');

                        const payloadSlots = buildPayloadSlots(next);
                        try {
                          await apiClient.upsertAvailability({ slots: payloadSlots });
                          Alert.alert('삭제 완료', '선택한 날짜의 가능시간이 삭제되었습니다.');
                        } catch {
                          Alert.alert('삭제 실패', '가용시간 삭제 중 오류가 발생했습니다.');
                        }
                      },
                    },
                  ],
                );
              }}
              disabled={!hasConfiguredInSelection}
            >
              <Text
                style={[
                  styles.deleteButtonText,
                  !hasConfiguredInSelection && styles.deleteButtonTextDisabled,
                ]}
              >
                삭제
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.applyButton,
                (!canApply || isUnavailable) && styles.applyButtonDisabled,
              ]}
              onPress={applyTimeToSelectedDates}
              disabled={!canApply || isUnavailable}
            >
              <Plus color={canApply && !isUnavailable ? Colors.brandInk : '#9CA3AF'} size={20} />
              <Text
                style={[
                  styles.applyButtonText,
                  (!canApply || isUnavailable) && styles.applyButtonTextDisabled,
                ]}
              >
                등록
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>등록된 가능시간</Text>
          {allConfiguredSlots.length === 0 ? (
            <Text style={styles.emptyText}>등록된 가능시간이 없습니다.</Text>
          ) : (
            allConfiguredSlots.map((item) => (
              <View key={`${item.date}-${item.start}`} style={styles.slotDisplayRow}>
                <Text style={styles.slotDisplayText}>
                  {item.date} {item.start}-{item.end}
                </Text>
              </View>
            ))
          )}
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  // 월별 상태 배너
  monthBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthLabel: { fontSize: 14, fontWeight: '600', color: Colors.brandInk },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  statusBadgeAvailable: { backgroundColor: '#ECFDF5' },
  statusBadgeUnavailable: { backgroundColor: '#FEF2F2' },
  statusBadgeText: { fontSize: 14, fontWeight: '600' },
  statusBadgeTextAvailable: { color: '#059669' },
  statusBadgeTextUnavailable: { color: '#DC2626' },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: { fontSize: 12, color: '#92400E', flex: 1 },
  unavailableButton: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  unavailableButtonSubmit: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  unavailableButtonCancel: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  unavailableButtonDisabled: { opacity: 0.5 },
  unavailableButtonText: { fontSize: 14, fontWeight: '700' },
  unavailableButtonTextSubmit: { color: '#DC2626' },
  unavailableButtonTextCancel: { color: '#059669' },
  // 캘린더 경고
  calendarWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  calendarWarningText: { fontSize: 12, color: '#92400E', flex: 1 },
  // 기존 스타일 유지
  timeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  activeHint: { fontSize: 12, color: Colors.brandInk, fontWeight: '600' },
  rangeText: { fontSize: 12, color: '#4B5563', marginTop: 4 },
  emptyText: { color: '#9CA3AF', fontSize: 14, marginBottom: 8 },
  slotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  timeInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.foreground,
  },
  slotDash: { marginHorizontal: 8, color: '#6B7280', fontWeight: '600' },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  deleteButton: {
    flex: 1,
    marginRight: 6,
    paddingVertical: 12,
    ...Radius.button,
    borderWidth: 1,
    borderColor: Colors.colorError,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  deleteButtonDisabled: { borderColor: '#FECACA', backgroundColor: '#FFF7ED' },
  deleteButtonText: { fontSize: 14, fontWeight: '600', color: Colors.colorError },
  deleteButtonTextDisabled: { color: '#FDA4A4' },
  applyButton: {
    flex: 1,
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    ...Radius.button,
    backgroundColor: Colors.brandHoney,
  },
  applyButtonDisabled: { backgroundColor: '#E5E7EB' },
  applyButtonText: { color: Colors.brandInk, fontWeight: '700', marginLeft: 6 },
  applyButtonTextDisabled: { color: '#9CA3AF' },
  slotDisplayRow: { paddingVertical: 8 },
  slotDisplayText: { fontSize: 14, color: '#374151' },
});
