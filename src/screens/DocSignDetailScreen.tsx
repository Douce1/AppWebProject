import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SignaturePad } from '../components/molecules/SignaturePad';

export default function DocSignDetailScreen() {
  const [signature, setSignature] = useState<string | null>(null);

  const handleSign = (sig: string) => {
    setSignature(sig);
    Alert.alert('서명 완료', '전자 서명이 완료되었습니다.\n(현재는 샘플 동작입니다.)');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>(샘플) 개인정보 활용 동의서</Text>
        <Text style={styles.subTitle}>(샘플) 메가강남본원 · 2023 하반기</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>동의 내용</Text>
          <Text style={styles.paragraph}>
            본 동의서는 강사님의 개인정보(성명, 연락처, 계좌 정보 등)를 강의 배정, 급여 정산,
            행정 업무 처리를 위해 수집·이용하는 것에 대한 동의 절차입니다.
          </Text>
          <Text style={styles.paragraph}>
            수집된 정보는 관련 법령에서 정하는 바에 따라 안전하게 보관되며, 동의 철회 요청 시
            내부 정책에 따라 지체 없이 처리됩니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>서명 대상 정보</Text>
          <Text style={styles.item}>(샘플) · 이름: 김태완</Text>
          <Text style={styles.item}>(샘플) · 소속: 메가강남본원</Text>
          <Text style={styles.item}>(샘플) · 계약 기간: 2023-09-01 ~ 2024-02-28</Text>
        </View>

        <View style={styles.signatureSection}>
          <Text style={styles.sectionTitle}>서명 영역</Text>
          <SignaturePad onOK={handleSign} />
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
  paragraph: { fontSize: 13, color: '#4B5563', lineHeight: 20, marginBottom: 6 },
  item: { fontSize: 13, color: '#4B5563', marginBottom: 2 },
  signatureSection: {
    marginTop: 24,
  },
});

