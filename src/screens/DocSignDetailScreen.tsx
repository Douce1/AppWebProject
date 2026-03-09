import { Colors } from '@/constants/theme';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SignaturePad } from '../components/molecules/SignaturePad';

export default function DocSignDetailScreen() {
  const [signature, setSignature] = useState<string | null>(null);

  const handleSign = (sig: string) => {
    setSignature(sig);
    Alert.alert('서명 완료', '전자 서명이 완료되었습니다.');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>개인정보 수집 동의서</Text>
        <Text style={styles.subTitle}>기관명 및 기간 정보는 실제 계약서에서 제공됩니다.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>동의 내용</Text>
          <Text style={styles.paragraph}>
            본 동의서는 강사님의 개인정보(성명, 연락처, 계좌 정보 등)를 강의 배정, 급여 정산, 행정 업무 처리를 위해 수집・이용하는 것에 대한 동의 안내서입니다.
          </Text>
          <Text style={styles.paragraph}>
            수집된 정보는 관련 법령에서 정하는 바에 따라 안전하게 보관되며, 동의 철회 요청 시 사내 정책에 따라 지체 없이 처리됩니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>서명 대상 정보</Text>
          <Text style={styles.item}>・ 이름: (계약서 기준)</Text>
          <Text style={styles.item}>・ 소속: (계약서 기준)</Text>
          <Text style={styles.item}>・ 계약 기간: (계약서 기준)</Text>
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
  container: { flex: 1, backgroundColor: Colors.background, paddingVertical: 24 },
  card: {
    marginHorizontal: 16,
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 5,
    gap: 32,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: Colors.brandInk, marginBottom: 4 },
  subTitle: { fontSize: 14, color: Colors.mutedForeground, marginBottom: 16 },
  section: {
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.brandInk, marginBottom: 8 },
  paragraph: { fontSize: 13, color: Colors.mutedForeground, lineHeight: 20, marginBottom: 6 },
  item: { fontSize: 13, color: Colors.mutedForeground, marginBottom: 4 },
  signatureSection: {
    marginTop: 0,
    gap: 16,
  },
});
