import { Colors, Radius, Shadows } from '@/constants/theme';
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Plus } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

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

// 초기값 디폴트: 가능시간 없이 시작
const SAMPLE_AVAILABILITY: AvailabilityMap = {};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

  const [availability, setAvailability] = useState<AvailabilityMap>(SAMPLE_AVAILABILITY);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [focusedDate, setFocusedDate] = useState<string>(minDate);
  const [startTimeInput, setStartTimeInput] = useState('09:00');
  const [endTimeInput, setEndTimeInput] = useState('18:00');
  const [rangeText, setRangeText] = useState('');

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

  const markedDates: MarkedDates = useMemo(() => {
    const marked: MarkedDates = {};

    // 1) 기본: 가능시간이 설정된 날짜는 초록색 "설정 완료" 상태( + 초록 점 )
    Object.keys(availability).forEach((date) => {
      const hasSlots = availability[date] && availability[date].length > 0;
      if (!hasSlots) return;
      marked[date] = {
        selected: true,
        selectedColor: '#10B981',
        selectedTextColor: '#FFFFFF',
        marked: true,
        dotColor: '#10B981',
      };
    });

    // 2) 현재 작업 범위로 선택된 날짜들은 모두 보라색 "작업 중" 상태로 덮어씀
    //    이미 설정된 날짜라면 초록색 점(dot)으로 "설정됨" 상태를 함께 표시
    selectedDates.forEach((date) => {
      const hasSlots = availability[date] && availability[date].length > 0;
      marked[date] = {
        selected: true,
        selectedColor: Colors.brandInk,
        selectedTextColor: '#FFFFFF',
        marked: hasSlots || marked[date]?.marked,
        dotColor: hasSlots || marked[date]?.marked ? '#10B981' : undefined,
      };
    });

    return marked;
  }, [selectedDates, availability]);

  const handleDayPress = (day: { dateString: string }) => {
    const date = day.dateString;
    setFocusedDate(date);
    const hasSlots = availability[date] && availability[date].length > 0;

    // 범위 시작이 아직 없을 때
    if (!rangeStart) {
      // 이미 설정된 날짜를 누르면 해당 시간 값으로 수정 모드 진입 + 선택 시작
      if (hasSlots) {
        const firstSlot = availability[date][0];
        setStartTimeInput(firstSlot.start);
        setEndTimeInput(firstSlot.end);
      }

      // 이미 선택된 날짜를 다시 누르면 전체 선택 해제
      if (selectedDates.length === 1 && selectedDates[0] === date) {
        setSelectedDates([]);
        return;
      }

      // 새로운 범위 시작
      setRangeStart(date);
      setSelectedDates([date]);
      return;
    }

    // 범위 시작이 있을 때 같은 날짜를 다시 누르면 범위 선택 취소
    if (rangeStart === date) {
      setRangeStart(null);
      setSelectedDates([]);
      return;
    }

    // 시작~끝 범위를 한 번에 선택 (기존 데이터 유무와 상관없이 전체 포함)
    const range = getDatesInRange(rangeStart, date);
    setSelectedDates(range);
    setRangeStart(null);
  };

  const applyTimeToSelectedDates = () => {
    if (!selectedDates.length) {
      Alert.alert('알림', '가능시간을 적용할 날짜를 먼저 선택해주세요.');
      return;
    }
    setAvailability((prev) => {
      const next: AvailabilityMap = { ...prev };
      selectedDates.forEach((date) => {
        next[date] = [{ start: startTimeInput, end: endTimeInput }];
      });
      return next;
    });
    // 등록 후 선택 상태 초기화
    setSelectedDates([]);
    setRangeStart(null);
    setRangeText('');
    Alert.alert('등록 완료', '선택한 날짜의 가능시간이 설정되었습니다.');
  };

  const currentSlots: TimeSlot[] = availability[focusedDate] ?? [];
  const canApply = selectedDates.length > 0;
  const hasSelection = selectedDates.length > 0 || !!rangeText;
  const hasConfiguredInSelection = selectedDates.some(
    (date) => availability[date] && availability[date].length > 0,
  );

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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>가능 날짜 선택 (오늘 ~ 2개월)</Text>
          <Calendar
            minDate={minDate}
            maxDate={maxDate}
            markedDates={markedDates}
            onDayPress={handleDayPress}
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
            />
            <Text style={styles.slotDash}>~</Text>
            <TextInput
              style={styles.timeInput}
              value={endTimeInput}
              onChangeText={setEndTimeInput}
              placeholder="18:00"
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
                      onPress: () => {
                        setAvailability((prev) => {
                          const next: AvailabilityMap = { ...prev };
                          selectedDates.forEach((date) => {
                            if (next[date]) {
                              delete next[date];
                            }
                          });
                          return next;
                        });
                        setSelectedDates([]);
                        setRangeStart(null);
                        setRangeText('');
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
              style={[styles.applyButton, !canApply && styles.applyButtonDisabled]}
              onPress={applyTimeToSelectedDates}
              disabled={!canApply}
            >
              <Plus color={canApply ? '#FFFFFF' : '#9CA3AF'} size={20} />
              <Text style={[styles.applyButtonText, !canApply && styles.applyButtonTextDisabled]}>
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
            allConfiguredSlots.map((item, index) => (
              <View key={`${item.date}-${index}`} style={styles.slotDisplayRow}>
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
  section: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  timeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  activeHint: { fontSize: 12, color: Colors.brandInk, fontWeight: '600' },
  rangeText: { fontSize: 12, color: '#4B5563', marginTop: 4 },
  rangeInput: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  emptyText: { color: '#9CA3AF', fontSize: 14, marginBottom: 8 },
  slotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  timeInput: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, fontSize: 14 },
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F97373',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  deleteButtonDisabled: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF7ED',
  },
  deleteButtonText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  deleteButtonTextDisabled: { color: '#FDA4A4' },
  applyButton: {
    flex: 1,
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    ...Radius.button,
    backgroundColor: Colors.brandInk,
  },
  applyButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  applyButtonText: { color: Colors.brandHoney, fontWeight: '700', marginLeft: 6 },
  applyButtonTextDisabled: { color: '#9CA3AF' },
  slotDisplayRow: { paddingVertical: 8 },
  slotDisplayText: { fontSize: 14, color: '#374151' },
});
