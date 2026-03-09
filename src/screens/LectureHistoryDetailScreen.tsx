import { Colors, Radius, Shadows } from '@/constants/theme';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

type LectureDetail = {
  id: string;
  date: string;
  region: string;
  museum: string;
  title: string;
  durationHours: number;
  notes?: string;
};

export default function LectureHistoryDetailScreen() {
  const params = useLocalSearchParams();
  const lectureString =
    typeof params.lecture === 'string'
      ? params.lecture
      : Array.isArray(params.lecture)
        ? params.lecture[0]
        : null;

  const lecture: LectureDetail | null = lectureString ? JSON.parse(lectureString) : null;

  if (!lecture) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.emptyText}>강의 상세 정보를 불러올 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{lecture.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{lecture.date}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{lecture.region}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{lecture.museum}</Text>
          </View>
        </View>

        <View style={styles.durationCard}>
          <Text style={styles.durationLabel}>총 강의 시간</Text>
          <Text style={styles.durationValue}>{lecture.durationHours}시간</Text>
        </View>

        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>특이 사항</Text>
          <Text style={styles.notesValue}>
            {lecture.notes && lecture.notes.trim().length > 0
              ? lecture.notes
              : '등록된 특이 사항이 없습니다.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: 20,
    ...Shadows.card,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.foreground,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surfaceSoft,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
    color: Colors.foreground,
  },
  durationCard: {
    marginTop: 4,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  durationLabel: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  notesCard: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notesLabel: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginBottom: 6,
  },
  notesValue: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
});
