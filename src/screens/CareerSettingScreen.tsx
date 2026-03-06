import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '../api/apiClient';

type LectureRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  region: string; // 시·도
  museum: string; // 박물관/기관명
  title: string;
  durationHours: number; // 강의 시간(시간 단위)
  notes?: string; // 특이 사항
};

type Filters = {
  startYearMonth?: string | null;
  endYearMonth?: string | null;
  region?: string | null;
  museum?: string | null;
};

const toYearMonth = (dateStr: string) => dateStr.slice(0, 7);

const applyFilters = (records: LectureRecord[], filters: Filters) => {
  const { startYearMonth, endYearMonth, region, museum } = filters;

  return records.filter((r) => {
    const ym = toYearMonth(r.date);

    if (startYearMonth && ym < startYearMonth) return false;
    if (endYearMonth && ym > endYearMonth) return false;
    if (region && r.region !== region) return false;
    if (museum && r.museum !== museum) return false;

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

  // 입력용 필터 상태 (연월/지역/박물관)
  const [startYearMonth, setStartYearMonth] = useState<string | null>(defaultStartYm);
  const [endYearMonth, setEndYearMonth] = useState<string | null>(defaultEndYm);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedMuseum, setSelectedMuseum] = useState<string | null>(null);
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [museumDropdownOpen, setMuseumDropdownOpen] = useState(false);

  // 실제로 적용된 필터 상태 (조회 버튼 눌렀을 때만 반영)
  const [appliedStartYearMonth, setAppliedStartYearMonth] = useState<string | null>(defaultStartYm);
  const [appliedEndYearMonth, setAppliedEndYearMonth] = useState<string | null>(defaultEndYm);
  const [appliedRegion, setAppliedRegion] = useState<string | null>(null);
  const [appliedMuseum, setAppliedMuseum] = useState<string | null>(null);
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
        // 실패 시에는 빈 배열 유지 (UI는 "검색 결과가 없습니다" 처리)
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
        region: appliedRegion,
        museum: appliedMuseum,
      }),
    [lectures, appliedStartYearMonth, appliedEndYearMonth, appliedRegion, appliedMuseum],
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
    setSelectedRegion(null);
    setSelectedMuseum(null);

    setAppliedStartYearMonth(defaultStartYm);
    setAppliedEndYearMonth(defaultEndYm);
    setAppliedRegion(null);
    setAppliedMuseum(null);
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
      {/* 1. 써머리 영역 (초기/필터 후 모두 노출) */}
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
          <Text style={styles.summaryLabel}>지역 수</Text>
          <Text style={styles.summaryValue}>{summary.regionCount}개 시·도</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>박물관 수</Text>
          <Text style={styles.summaryValue}>{summary.museumCount}개 기관</Text>
        </View>
      </View>

      {/* 2. 그리드(리스트) 영역 + 필터 아이콘 */}
      <View style={styles.listSection}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>강의 이력</Text>
          <TouchableOpacity
            style={styles.filterIconButton}
            onPress={() => setShowFilters((prev) => !prev)}
          >
            <Filter color="#4F46E5" size={18} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filterPanel}>
            <Text style={styles.filterPanelTitle}>기간 필터 (연·월)</Text>
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
            <View style={styles.filterRow}>
              <View style={styles.comboContainer}>
                <TouchableOpacity
                  style={styles.selectorPill}
                  onPress={() => {
                    setRegionDropdownOpen((prev) => !prev);
                    setMuseumDropdownOpen(false);
                  }}
                >
                  <Text style={styles.filterValue}>{selectedRegion ?? '전체'}</Text>
                </TouchableOpacity>
                {regionDropdownOpen && (
                  <View style={styles.dropdown}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedRegion(null);
                        setRegionDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownText}>전체</Text>
                    </TouchableOpacity>
                    {regionOptions.map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedRegion(r);
                          setRegionDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownText}>{r}</Text>
                      </TouchableOpacity>
                    ))}
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
                  <Text style={styles.filterValue}>{selectedMuseum ?? '전체'}</Text>
                </TouchableOpacity>
                {museumDropdownOpen && (
                  <View style={styles.dropdown}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedMuseum(null);
                        setMuseumDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownText}>전체</Text>
                    </TouchableOpacity>
                    {museumOptions.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedMuseum(m);
                          setMuseumDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownText}>{m}</Text>
                      </TouchableOpacity>
                    ))}
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
                  setAppliedRegion(selectedRegion);
                  setAppliedMuseum(selectedMuseum);
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
              style={styles.card}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/profile/career-detail' as any,
                  params: { lecture: JSON.stringify(item) },
                })
              }
            >
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardHourBadge}>{item.durationHours}시간</Text>
              </View>
              <Text style={styles.cardMetaText}>{item.date}</Text>
              <Text style={styles.cardMetaText}>
                {item.region} · {item.museum}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
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
  filterValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
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
    backgroundColor: '#EEF2FF',
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
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginTop: 10,
    backgroundColor: '#F9FAFB',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  cardHourBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#EEF2FF',
    fontSize: 12,
    color: '#4F46E5',
    overflow: 'hidden',
  },
  cardMetaText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  inputGroup: {
    flex: 1,
    marginRight: 8,
  },
  textInput: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    backgroundColor: 'white',
  },
  quickRangeButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  quickRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    marginRight: 8,
  },
  quickRangeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  selectorPill: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 0,
    backgroundColor: 'white',
  },
  comboContainer: {
    flex: 1,
    marginRight: 8,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    maxHeight: 180,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownText: {
    fontSize: 13,
    color: '#111827',
  },
  searchButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  filterActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
});
