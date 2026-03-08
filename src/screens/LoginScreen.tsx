import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { httpClient } from '@/src/api/httpClient';
import { saveTokens } from '@/src/store/authStore';

type DemoInstructor = {
  email: string;
  name: string;
  description: string;
};

const DEMO_INSTRUCTORS: DemoInstructor[] = [
  {
    email: 'teacher01@museum-demo.kr',
    name: '김철수 강사',
    description: '계약완료 수업 확인용',
  },
  {
    email: 'teacher02@museum-demo.kr',
    name: '이영희 강사',
    description: '완료 수업 이력 확인용',
  },
  {
    email: 'teacher03@museum-demo.kr',
    name: '박지민 강사',
    description: '배정 대기 요청 확인용',
  },
  {
    email: 'teacher04@museum-demo.kr',
    name: '정민수 강사',
    description: '거절 이력 확인용',
  },
  {
    email: 'teacher05@museum-demo.kr',
    name: '강혜린 강사',
    description: '진행중 수업 확인용',
  },
  {
    email: 'teacher06@museum-demo.kr',
    name: '김용관 강사',
    description: '긴급 대강 후보 확인용',
  },
  {
    email: 'teacher07@museum-demo.kr',
    name: '박지혁 강사',
    description: '완료 보고서 확인용',
  },
  {
    email: 'teacher08@museum-demo.kr',
    name: '최수빈 강사',
    description: '신규 배정 대기 확인용',
  },
  {
    email: 'teacher09@museum-demo.kr',
    name: '오민재 강사',
    description: '계약 발송 상태 확인용',
  },
  {
    email: 'teacher10@museum-demo.kr',
    name: '한지윤 강사',
    description: '유물 탐구 수업 확인용',
  },
];

export default function LoginScreen() {
  const [selectedEmail, setSelectedEmail] = useState(DEMO_INSTRUCTORS[0].email);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedInstructor = useMemo(
    () =>
      DEMO_INSTRUCTORS.find((instructor) => instructor.email === selectedEmail) ??
      DEMO_INSTRUCTORS[0],
    [selectedEmail],
  );

  const completeLogin = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const data = await httpClient.loginWithDemoAccount({
        channel: 'app',
        email: selectedInstructor.email,
      });

      await saveTokens(data.accessToken, data.refreshToken);
      router.replace('/(tabs)');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brand}>free-b</Text>
        <Text style={styles.title}>발표용 데모 로그인</Text>
        <Text style={styles.description}>
          강사 계정을 선택하면 데모 서버의 수업, 계약, 채팅 데이터를 바로 확인할 수
          있습니다.
        </Text>

        <Text style={styles.label}>강사 계정 선택</Text>

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => {
            setIsSelectorOpen((open) => !open);
          }}
          style={({ pressed }) => [
            styles.selectorButton,
            (pressed || isSelectorOpen) && styles.selectorButtonPressed,
          ]}
        >
          <View style={styles.selectorHeader}>
            <View style={styles.selectorCopy}>
              <Text style={styles.selectorTitle}>{selectedInstructor.name}</Text>
              <Text style={styles.selectorDescription}>
                {selectedInstructor.description}
              </Text>
            </View>
            <Text style={styles.selectorChevron}>{isSelectorOpen ? '▲' : '▼'}</Text>
          </View>
        </Pressable>

        {isSelectorOpen ? (
          <ScrollView style={styles.optionList} nestedScrollEnabled>
            {DEMO_INSTRUCTORS.map((instructor) => {
              const isSelected = instructor.email === selectedInstructor.email;

              return (
                <Pressable
                  key={instructor.email}
                  accessibilityRole="button"
                  onPress={() => {
                    setSelectedEmail(instructor.email);
                    setIsSelectorOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.optionRow,
                    isSelected && styles.optionRowSelected,
                    pressed && styles.optionRowPressed,
                  ]}
                >
                  <Text style={styles.optionTitle}>{instructor.name}</Text>
                  <Text style={styles.optionDescription}>
                    {instructor.description}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => {
            void completeLogin();
          }}
          style={({ pressed }) => [
            styles.button,
            (pressed || isSubmitting) && styles.buttonPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>선택한 강사로 로그인</Text>
          )}
        </Pressable>

        <Text style={styles.helperText}>
          백엔드 서버와 seed 데이터가 실행 중이어야 로그인됩니다.
        </Text>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f3f4f6',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    marginBottom: 24,
  },
  label: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  selectorButton: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  selectorButtonPressed: {
    borderColor: '#111827',
    backgroundColor: '#f3f4f6',
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectorCopy: {
    flex: 1,
    gap: 4,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  selectorDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
  },
  selectorChevron: {
    fontSize: 14,
    color: '#6b7280',
  },
  optionList: {
    maxHeight: 220,
    marginTop: 10,
    marginBottom: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  optionRowSelected: {
    backgroundColor: '#eff6ff',
  },
  optionRowPressed: {
    opacity: 0.85,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  helperText: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: '#b91c1c',
  },
});
