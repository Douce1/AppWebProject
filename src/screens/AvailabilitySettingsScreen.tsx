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
import { AlertTriangle, Plus } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { apiClient } from '../api/apiClient';
import type { ApiLesson, ApiMonthSubmission } from '../api/types';
import { useLessonsQuery } from '../query/hooks';

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

/** 확정 수업 상태 (이슈 #134: 이 상태면 해당 월 출강 불가 전환 불가) */
const CONFIRMED_LESSON_STATUSES: ApiLesson['status'][] = [
  'ACCEPTED',
  'CONTRACT_SIGNED',
  'IN_PROGRESS',
];

/** 수업이 해당 월에 포함되는지 (startsAt/endsAt 기준) */
function lessonFallsInMonth(lesson: ApiLesson, yearMonth: string): boolean {
  const startMonth = lesson.startsAt?.slice(0, 7);
  const endMonth = lesson.endsAt?.slice(0, 7);
  return yearMonth === startMonth || yearMonth === endMonth;
}

/** 해당 월에 확정 수업이 하나라도 있으면 true (이슈 #134) */
export function hasConfirmedLessonInMonth(
  lessons: ApiLesson[],
  yearMonth: string,
): boolean {
  return lessons.some(
    (l) =>
      CONFIRMED_LESSON_STATUSES.includes(l.status) &&
      lessonFallsInMonth(l, yearMonth),
  );
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

  const lessonsQuery = useLessonsQuery();
  const lessons = lessonsQuery.data ?? [];
  const hasConfirmedLessonInCurrentMonth = useMemo(
    () => hasConfirmedLessonInMonth(lessons, viewMonth),
    [lessons, viewMonth],
  );
  const cannotSwitchToUnavailable =
    hasConfirmedLessonInCurrentMonth && !(monthSubmission?.isUnavailable ?? false);

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

  // 월 출강 불가 토글 (버튼: 캘린더 헤더 우측)
  const handleMonthUnavailableToggle = async () => {
    if (monthSubmissionUpdating) return;
    const next = !(monthSubmission?.isUnavailable ?? false);
    const monthNum = parseInt(viewMonth.split('-')[1], 10);

    const title = next ? '출강 불가 제출' : '출강 불가 해제';
    const message = next
      ? `${monthNum}월 출강불가로 제출하시겠습니까?\n확인 시 등록되어 있던 출강가능 날짜는 지워집니다.`
      : `${formatMonthLabel(viewMonth)} 출강 불가를 해제하시겠습니까?`;

    Alert.alert(title, message, [
      { text: '취소', style: 'cancel' },
      {
        text: '확인',
        style: next ? 'destructive' : 'default',
        onPress: async () => {
          setMonthSubmissionUpdating(true);
          const prev = monthSubmission;
          const prevAvailability = availability;

          // Optimistic: 상태 업데이트
          setMonthSubmission((s) =>
            s
              ? { ...s, isUnavailable: next, submittedAt: next ? new Date().toISOString() : null }
              : { month: viewMonth, isUnavailable: next, submittedAt: next ? new Date().toISOString() : null },
          );

          // 출강불가 제출 시: 해당 월 슬롯 Optimistic 삭제
          let nextAvailability = availability;
          if (next) {
            nextAvailability = Object.fromEntries(
              Object.entries(availability).filter(([date]) => !date.startsWith(viewMonth)),
            );
            setAvailability(nextAvailability);
          }

          try {
            const updated = await apiClient.updateMonthSubmission(viewMonth, next);
            if (updated && typeof updated.submittedAt === 'string') {
              setMonthSubmission((s) =>
                s
                  ? { ...s, submittedAt: updated.submittedAt, isUnavailable: next }
                  : { month: viewMonth, isUnavailable: next, submittedAt: updated.submittedAt },
              );
            }

            // 출강불가 제출 시: 해당 월 슬롯 백엔드 동기화
            if (next) {
              await apiClient.upsertAvailability({ slots: buildPayloadSlots(nextAvailability) });
            }

            Alert.alert(
              next ? '출강 불가 제출 완료' : '출강 불가 해제 완료',
              next
                ? `${formatMonthLabel(viewMonth)}이 출강 불가로 제출되었습니다.`
                : `${formatMonthLabel(viewMonth)} 출강 불가가 해제되었습니다.`,
            );
          } catch (error) {
            // 롤백
            setMonthSubmission(prev);
            if (next) setAvailability(prevAvailability);
            const status = (error as { status?: number }).status;
            const message =
              status === 409
                ? '이 달에는 이미 확정된 수업이 있어 출강 불가로 변경할 수 없습니다.'
                : '월별 출강 상태 변경에 실패했습니다. 다시 시도해주세요.';
            Alert.alert('저장 실패', message);
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
    if (isUnavailable) {
      return;
    }
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

      // 출강 불가 상태에서 slot을 등록하면 자동으로 출강 불가 해제
      if (isUnavailable) {
        try {
          const updated = await apiClient.updateMonthSubmission(viewMonth, false);
          if (updated && typeof updated.submittedAt === 'string') {
            setMonthSubmission({
              month: viewMonth,
              isUnavailable: false,
              submittedAt: updated.submittedAt,
            });
          } else {
            setMonthSubmission((s) =>
              s
                ? { ...s, isUnavailable: false, submittedAt: null }
                : { month: viewMonth, isUnavailable: false, submittedAt: null },
            );
          }
        } catch {
          // 월 상태 해제 실패는 치명적이지 않으므로 알림만 표시
          Alert.alert(
            '상태 동기화 실패',
            '가용시간은 저장되었지만 출강 불가 상태 해제에는 실패했습니다. 다시 시도해주세요.',
          );
        }
      }

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
  const hasConfiguredInSelection = selectedDates.some(
    (date) => availability[date] && availability[date].length > 0,
  );
  const isUnavailable = monthSubmission?.isUnavailable ?? false;

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
        {/* ── 캘린더 섹션 (헤더에 출강불가 버튼 통합) ── */}
        <View style={styles.section}>
          {/* 헤더: 가능 날짜 선택 + 출강 불가 버튼 */}
          <View style={styles.calendarTitleRow}>
            <View>
              <Text style={styles.sectionTitle}>가능 날짜 선택</Text>
              {monthSubmissionLoading ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.brandInk}
                  style={{ alignSelf: 'flex-start', marginTop: 4 }}
                />
              ) : (
                <Text
                  style={[
                    styles.monthStatusText,
                    isUnavailable && styles.monthStatusUnavailable,
                  ]}
                >
                  {formatMonthLabel(viewMonth)} ·{' '}
                  {isUnavailable ? '출강 불가' : '출강 가능'}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.unavailableChip,
                isUnavailable && styles.unavailableChipActive,
                (monthSubmissionUpdating || monthSubmissionLoading || cannotSwitchToUnavailable) &&
                  styles.unavailableChipDisabled,
              ]}
              onPress={handleMonthUnavailableToggle}
              disabled={monthSubmissionUpdating || monthSubmissionLoading || cannotSwitchToUnavailable}
            >
              {monthSubmissionUpdating ? (
                <ActivityIndicator
                  size="small"
                  color={isUnavailable ? '#059669' : '#DC2626'}
                />
              ) : (
                <Text
                  style={[
                    styles.unavailableChipText,
                    isUnavailable && styles.unavailableChipTextActive,
                  ]}
                >
                  {isUnavailable ? '불가 해제' : '출강 불가'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 출강 불가 경고 배너 */}
          {isUnavailable && (
            <View style={styles.calendarWarningBanner}>
              <AlertTriangle size={14} color="#92400E" style={{ marginRight: 6 }} />
              <Text style={styles.calendarWarningText}>
                출강 불가 상태입니다. 해제 후 slot을 등록해주세요.
              </Text>
            </View>
          )}
          {cannotSwitchToUnavailable && (
            <View style={styles.calendarWarningBanner}>
              <AlertTriangle size={14} color="#92400E" style={{ marginRight: 6 }} />
              <Text style={styles.calendarWarningText}>
                이 달에는 이미 확정된 수업이 있어 출강 불가로 변경할 수 없습니다.
              </Text>
            </View>
          )}

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

        {/* ── 가능시간 일괄 설정 ── */}
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
              style={[styles.timeInput, isUnavailable && styles.timeInputDisabled]}
              value={startTimeInput}
              onChangeText={setStartTimeInput}
              placeholder="09:00"
              placeholderTextColor={Colors.mutedForeground}
              editable={!isUnavailable}
            />
            <Text style={styles.slotDash}>~</Text>
            <TextInput
              style={[styles.timeInput, isUnavailable && styles.timeInputDisabled]}
              value={endTimeInput}
              onChangeText={setEndTimeInput}
              placeholder="18:00"
              placeholderTextColor={Colors.mutedForeground}
              editable={!isUnavailable}
            />
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                (!hasConfiguredInSelection || isUnavailable) && styles.deleteButtonDisabled,
              ]}
              onPress={() => {
                if (!hasConfiguredInSelection || isUnavailable) return;
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
              disabled={!hasConfiguredInSelection || isUnavailable}
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
              <Plus
                color={canApply && !isUnavailable ? Colors.brandInk : '#9CA3AF'}
                size={20}
              />
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
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  // 캘린더 헤더
  calendarTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthStatusText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  monthStatusUnavailable: { color: '#DC2626' },
  // 출강 불가 pill 버튼
  unavailableChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableChipActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  unavailableChipDisabled: { opacity: 0.5 },
  unavailableChipText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },
  unavailableChipTextActive: { color: '#059669' },
  // 캘린더 경고 배너
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
  // 가능시간 설정
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
  timeInputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
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
});
