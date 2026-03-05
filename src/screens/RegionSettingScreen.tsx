import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useProfile } from '../context/ProfileContext';
import { REGION_SIDO_GU } from '../data/regionData';

/** 저장값이 "시도 구" 형식이면 시·도만 반환 (기존 데이터 호환) */
function toSidoOnly(value: string): string {
  const space = value.indexOf(' ');
  return space > 0 ? value.slice(0, space) : value;
}

const SIDO_LIST = REGION_SIDO_GU.map((r) => r.sido);

export default function RegionSettingScreen() {
  const { selectedRegions, setSelectedRegions } = useProfile();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(selectedRegions.map(toSidoOnly)));

  useEffect(() => {
    setSelected(new Set(selectedRegions.map(toSidoOnly)));
  }, [selectedRegions]);

  const toggle = (sido: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sido)) next.delete(sido);
      else next.add(sido);
      return next;
    });
  };

  const removeTag = (sido: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(sido);
      return next;
    });
  };

  const handleSave = () => {
    const list = Array.from(selected);
    setSelectedRegions(list);
    Alert.alert('저장 완료', '희망 지역이 저장되었습니다.');
  };

  const selectedList = useMemo(() => Array.from(selected).sort(), [selected]);

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>희망 지역 (시·도만 선택, 다중 선택 가능)</Text>
        <View style={styles.tagContainer}>
          {SIDO_LIST.map((sido) => {
            const active = selected.has(sido);
            return (
              <TouchableOpacity
                key={sido}
                style={[styles.sidoTag, active && styles.sidoTagSelected]}
                onPress={() => toggle(sido)}
                activeOpacity={0.7}
              >
                {active && <Check color="#fff" size={14} style={styles.tagCheck} />}
                <Text style={[styles.sidoTagText, active && styles.sidoTagTextSelected]}>{sido}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.summaryArea}>
          <Text style={styles.summaryTitle}>선택된 지역</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {selectedList.map((r) => (
              <View key={r} style={styles.chip}>
                <Text style={styles.chipText}>{r}</Text>
                <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => removeTag(r)}>
                  <X color="#6B7280" size={16} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>저장</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  section: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sidoTag: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  sidoTagSelected: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  tagCheck: { marginRight: 6 },
  sidoTagText: { fontSize: 14, color: '#374151' },
  sidoTagTextSelected: { color: '#fff', fontWeight: '600' },
  footer: { backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  summaryArea: { marginBottom: 12 },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingVertical: 6, paddingLeft: 12, paddingRight: 6, borderRadius: 16, marginRight: 8, marginBottom: 4 },
  chipText: { fontSize: 13, color: '#4F46E5', fontWeight: '500', marginRight: 6 },
  saveButton: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
