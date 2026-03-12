import { Colors, Radius, Shadows } from '@/constants/theme';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Filter, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '../api/apiClient';

type LectureRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  region: string; // 권역/지역
  museum: string; // 박물관/기관명
  title: string;
  durationHours: number; // 강의 시간(시간 단위)
  notes?: string; // 특이 사항
};

type Filters = {
  startYearMonth?: string | null;
  endYearMonth?: string | null;
  regions?: string[] | null;
  museums?: string[] | null;
};

const toYearMonth = (dateStr: string) => dateStr.slice(0, 7);

const applyFilters = (records: LectureRecord[], filters: Filters) => {
  const { startYearMonth, endYearMonth, regions, museums } = filters;

  return records.filter((r) => {
    const ym = toYearMonth(r.date);

    if (startYearMonth && ym < startYearMonth) return false;
    if (endYearMonth && ym > endYearMonth) return false;
    if (regions && regions.length > 0 && !regions.includes(r.region)) return false;
    if (museums && museums.length > 0 && !museums.includes(r.museum)) return false;

    return true;
  });
};

export default function CareerSettingScreen() {
  const today = new Date();
  const endY = today.getFullYear();
  const endM = today.getMonth() + 1;
  const defaultEndYm = `${endY}-${String(endM).padStart(2, '0')}`;
  const startDate = new Date(endY, endM - 1, 1);
  const defaultStartYm = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;

  // 입력 중인 필터 상태 (년월/지역/박물관)
  const [startYearMonth, setStartYearMonth] = useState<string | null>(defaultStartYm);
  const [endYearMonth, setEndYearMonth] = useState<string | null>(defaultEndYm);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedMuseums, setSelectedMuseums] = useState<string[]>([]);
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [museumDropdownOpen, setMuseumDropdownOpen] = useState(false);

  // 실제로 적용된 필터 상태 (조회 버튼 누를 때만 반영)
  const [appliedStartYearMonth, setAppliedStartYearMonth] = useState<string | null>(defaultStartYm);
  const [appliedEndYearMonth, setAppliedEndYearMonth] = useState<string | null>(defaultEndYm);
  const [appliedRegions, setAppliedRegions] = useState<string[]>([]);
  const [appliedMuseums, setAppliedMuseums] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const router = useRouter();

  const [lectures, setLectures] = useState<LectureRecord[]>([]);

  useEffect(() => {
    let mounted = true;
    apiClient
      .getLectureHistory()
      .then((data) => {
        if (!mounted) return;
        setLectures(
          data.map((item) => ({
            id: item.id,
            date: item.date,
            region: item.region,
            museum: item.museum,
            title: item.title,
            durationHours: item.durationHours,
            notes: item.notes,
          })),
        );
      })
      .catch(() => {
        // 실패 시에는 빈 배열 유지 (UI에서 "검색 결과가 없습니다" 처리)
      });
    return () => {
      mounted = false;
    };
  }, []);

  const yearMonthOptions = useMemo(() => {
    const set = new Set<string>();
    lectures.forEach((l) => set.add(toYearMonth(l.date)));
    return Array.from(set).sort();
  }, [lectures]);

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    lectures.forEach((l) => set.add(l.region));
    return Array.from(set).sort();
  }, [lectures]);

  const museumOptions = useMemo(() => {
    const set = new Set<string>();
    lectures.forEach((l) => set.add(l.museum));
    return Array.from(set).sort();
  }, [lectures]);

  const filtered = useMemo(
    () =>
      applyFilters(lectures, {
        startYearMonth: appliedStartYearMonth,
        endYearMonth: appliedEndYearMonth,
        regions: appliedRegions.length > 0 ? appliedRegions : null,
        museums: appliedMuseums.length > 0 ? appliedMuseums : null,
      }),
    [lectures, appliedStartYearMonth, appliedEndYearMonth, appliedRegions, appliedMuseums],
  );

  const summary = useMemo(() => {
    const totalCount = filtered.length;
    const totalHours = filtered.reduce((sum, r) => sum + r.durationHours, 0);

    const regionSet = new Set<string>();
    const museumSet = new Set<string>();
    filtered.forEach((r) => {
      regionSet.add(r.region);
      museumSet.add(r.museum);
    });

    return {
      totalCount,
      totalHours,
      regionCount: regionSet.size,
      museumCount: museumSet.size,
    };
  }, [filtered]);

  const handleReset = () => {
    setStartYearMonth(defaultStartYm);
    setEndYearMonth(defaultEndYm);
    setSelectedRegions([]);
    setSelectedMuseums([]);

    setAppliedStartYearMonth(defaultStartYm);
    setAppliedEndYearMonth(defaultEndYm);
    setAppliedRegions([]);
    setAppliedMuseums([]);
  };

  const toggleRegion = (r: string) => {
    setSelectedRegions((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r].sort()
    );
  };

  const toggleMuseum = (m: string) => {
    setSelectedMuseums((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort()
    );
  };

  const formatMultiLabel = (arr: string[]) => {
    if (arr.length === 0) return '전체';
    if (arr.length <= 2) return arr.join(', ');
    return `${arr.length}개 선택`;
  };

  const applyQuickRange = (months: number) => {
    const base = new Date();
    const endYear = base.getFullYear();
    const endMonth = base.getMonth() + 1;
    const endYm = `${endYear}-${String(endMonth).padStart(2, '0')}`;

    const start = new Date(endYear, endMonth - 1, 1);
    start.setMonth(start.getMonth() - (months - 1));
    const startYm = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

    setStartYearMonth(startYm);
    setEndYearMonth(endYm);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 1. 요약 영역 (초기/필터 후 모두 노출) */}
      <View style={styles.summarySection}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>총 강의 건수</Text>
          <Text style={styles.summaryValue}>{summary.totalCount}건</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>총 강의 시간</Text>
          <Text style={styles.summaryValue}>{summary.totalHours}시간</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>지역(권역)</Text>
          <Text style={styles.summaryValue}>{summary.regionCount}개 권역</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>박물관 수</Text>
          <Text style={styles.summaryValue}>{summary.museumCount}개 기관</Text>
        </View>
      </View>

      {/* 2. 그리드 리스트 영역 + 필터 아이콘 */}
      <View style={styles.listSection}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>강의 이력</Text>
          <TouchableOpacity
            style={styles.filterIconButton}
            onPress={() => setShowFilters((prev) => !prev)}
          >
            <Filter color={Colors.brandInk} size={18} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filterPanel}>
            <Text style={styles.filterPanelTitle}>기간 필터 (년-월)</Text>
            <View style={styles.filterRow}>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.textInput}
                  placeholder="예: 2023-01"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={startYearMonth ?? ''}
                  onChangeText={setStartYearMonth}
                />
              </View>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.textInput}
                  placeholder="예: 2024-12"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={endYearMonth ?? ''}
                  onChangeText={setEndYearMonth}
                />
              </View>
            </View>

            <View style={styles.quickRangeButtons}>
              <TouchableOpacity
                style={styles.quickRangeButton}
                onPress={() => applyQuickRange(1)}
              >
                <Text style={styles.quickRangeText}>1개월</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickRangeButton}
                onPress={() => applyQuickRange(2)}
              >
                <Text style={styles.quickRangeText}>2개월</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickRangeButton}
                onPress={() => applyQuickRange(3)}
              >
                <Text style={styles.quickRangeText}>3개월</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterPanelTitle, { marginTop: 16 }]}>지역 / 박물관</Text>
            <View style={[styles.filterRow, (regionDropdownOpen || museumDropdownOpen) && styles.filterRowWithDropdown]}>
              <View style={styles.comboContainer}>
                <TouchableOpacity
                  style={styles.selectorPill}
                  onPress={() => {
                    setRegionDropdownOpen((prev) => !prev);
                    setMuseumDropdownOpen(false);
                  }}
                >
                  <Text style={styles.filterValue} numberOfLines={1}>
                    {formatMultiLabel(selectedRegions)}
                  </Text>
                </TouchableOpacity>
                {regionDropdownOpen && (
                  <View style={[styles.dropdown, styles.dropdownAbsolute]}>
                    <TouchableOpacity
                      style={[styles.dropdownItem, styles.dropdownItemRow, selectedRegions.length === 0 && styles.dropdownItemSelected]}
                      onPress={() => setSelectedRegions([])}
                    >
                      <Text style={styles.dropdownText}>전체</Text>
                      {selectedRegions.length === 0 && <Check color={Colors.brandInk} size={16} />}
                    </TouchableOpacity>
                    {regionOptions.map((r) => {
                      const isSelected = selectedRegions.includes(r);
                      return (
                        <TouchableOpacity
                          key={r}
                          style={[styles.dropdownItem, styles.dropdownItemRow, isSelected && styles.dropdownItemSelected]}
                          onPress={() => toggleRegion(r)}
                        >
                          <Text style={styles.dropdownText}>{r}</Text>
                          {isSelected && <Check color={Colors.brandInk} size={16} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.comboContainer}>
                <TouchableOpacity
                  style={styles.selectorPill}
                  onPress={() => {
                    setMuseumDropdownOpen((prev) => !prev);
                    setRegionDropdownOpen(false);
                  }}
                >
                  <Text style={styles.filterValue} numberOfLines={1}>
                    {formatMultiLabel(selectedMuseums)}
                  </Text>
                </TouchableOpacity>
                {museumDropdownOpen && (
                  <View style={[styles.dropdown, styles.dropdownAbsolute]}>
                    <TouchableOpacity
                      style={[styles.dropdownItem, styles.dropdownItemRow, selectedMuseums.length === 0 && styles.dropdownItemSelected]}
                      onPress={() => setSelectedMuseums([])}
                    >
                      <Text style={styles.dropdownText}>전체</Text>
                      {selectedMuseums.length === 0 && <Check color={Colors.brandInk} size={16} />}
                    </TouchableOpacity>
                    {museumOptions.map((m) => {
                      const isSelected = selectedMuseums.includes(m);
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[styles.dropdownItem, styles.dropdownItemRow, isSelected && styles.dropdownItemSelected]}
                          onPress={() => toggleMuseum(m)}
                        >
                          <Text style={styles.dropdownText}>{m}</Text>
                          {isSelected && <Check color={Colors.brandInk} size={16} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.filterActionRow}>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => {
                  setAppliedStartYearMonth(startYearMonth || null);
                  setAppliedEndYearMonth(endYearMonth || null);
                  setAppliedRegions([...selectedRegions]);
                  setAppliedMuseums([...selectedMuseums]);
                  setRegionDropdownOpen(false);
                  setMuseumDropdownOpen(false);
                }}
              >
                <Text style={styles.searchButtonText}>조회</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.resetButtonText}>초기화</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.listItemBox}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/profile/career-detail' as any,
                  params: { lecture: JSON.stringify(item) },
                })
              }
            >
              <View style={[styles.listItemField, styles.listItemFieldFirst]}>
                <Text style={styles.listItemValue}>
                  강의명 : {item.title}
                </Text>
              </View>
              <View style={styles.listItemField}>
                <Text style={styles.listItemValue}>
                  날짜 : {item.date}
                </Text>
              </View>
              <View style={styles.listItemField}>
                <Text style={styles.listItemValue}>
                  권역 · 기관 : {item.region} · {item.museum}
                </Text>
              </View>
              <View style={styles.listItemField}>
                <Text style={styles.listItemValueHighlight}>
                  총 강의 시간 : {item.durationHours}시간
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterRowWithDropdown: {
    marginBottom: 200,
  },
  filterPill: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: '#F9FAFB',
  },
  filterLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  filterValue: { fontSize: 14, color: Colors.foreground, fontWeight: '500' },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: { fontSize: 14, color: '#4B5563', fontWeight: '600' },
  summarySection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryItem: { flex: 1, marginRight: 8 },
  summaryLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  listSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 24,
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSoft,
  },
  filterPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
  },
  filterPanelTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  listItemBox: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  listItemField: {
    marginTop: 12,
  },
  listItemFieldFirst: {
    marginTop: 0,
  },
  listItemLabel: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginBottom: 4,
  },
  listItemValue: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
  listItemValueHighlight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  inputGroup: {
    flex: 1,
    marginRight: 8,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Radius.button,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.foreground,
  },
  quickRangeButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  quickRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surfaceSoft,
    marginRight: 8,
  },
  quickRangeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  selectorPill: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 0,
  },
  comboContainer: {
    flex: 1,
    marginRight: 8,
    position: 'relative',
    minHeight: 40,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    maxHeight: 180,
    overflow: 'hidden',
    ...Shadows.card,
  },
  dropdownAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 38,
    zIndex: 10,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemSelected: {
    backgroundColor: Colors.surfaceSoft,
  },
  dropdownText: {
    fontSize: 13,
    color: Colors.foreground,
  },
  searchButton: {
    flex: 1,
    ...Radius.button,
    backgroundColor: Colors.brandHoney,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    color: Colors.brandInk,
    fontWeight: '600',
  },
  filterActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
});
