import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function DocContractDetailScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>강남본원 2023 하반기 계약서</Text>
        <Text style={styles.subTitle}>체결일: 2023-09-01 · 계약기간: 2023-09-01 ~ 2024-02-28</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 계약 당사자</Text>
          <Text style={styles.paragraph}>· 원장: 메가강남본원 원장</Text>
          <Text style={styles.paragraph}>· 강사: 김태완</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 강의 및 근무 조건</Text>
          <Text style={styles.paragraph}>· 담당 과목: 수학</Text>
          <Text style={styles.paragraph}>· 근무 요일: 월, 수, 금</Text>
          <Text style={styles.paragraph}>· 기본 강의 시간: 14:00 ~ 22:00</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 정산 및 지급</Text>
          <Text style={styles.paragraph}>· 정산 주기: 매월 1회</Text>
          <Text style={styles.paragraph}>· 지급일: 익월 10일</Text>
          <Text style={styles.paragraph}>· 지급 방식: 등록된 계좌로 이체</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 기타 조항</Text>
          <Text style={styles.paragraph}>
            세부 조항은 실제 계약서 원본을 기준으로 하며, 본 화면은 모바일 열람용 요약본입니다.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
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
});

