import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors, Radius } from '@/constants/theme';
import { useSchedule } from '@/src/context/ScheduleContext';

export default function LessonReportScreen() {
    const router = useRouter();
    const { lessonId, lessonTitle } = useLocalSearchParams<{ lessonId: string; lessonTitle?: string }>();
    const { submitClassReport } = useSchedule();
    const [reportText, setReportText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reportText.trim()) {
            Alert.alert('입력 오류', '보고서 내용을 입력해주세요.');
            return;
        }
        if (!lessonId) return;
        setSubmitting(true);
        try {
            await submitClassReport(lessonId, reportText.trim());
            Alert.alert('완료', '강의 보고서가 제출되었습니다.', [
                { text: '확인', onPress: () => router.replace('/(tabs)') },
            ]);
        } catch {
            Alert.alert('오류', '보고서 저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>강의 보고서 작성</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <X size={24} color="#333" />
                </TouchableOpacity>
            </View>
            {!!lessonTitle && (
                <Text style={styles.lessonTitle}>{lessonTitle}</Text>
            )}
            <TextInput
                style={styles.input}
                placeholder="특이사항 및 강의 내용을 입력해주세요..."
                value={reportText}
                onChangeText={setReportText}
                multiline
                textAlignVertical="top"
                editable={!submitting}
            />
            <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
            >
                <Text style={styles.submitText}>{submitting ? '제출 중...' : '작성 완료'}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.brandInk },
    closeBtn: { padding: 4 },
    lessonTitle: { fontSize: 16, color: '#555', marginBottom: 16, fontWeight: '500' },
    input: {
        backgroundColor: Colors.surfaceSoft,
        borderRadius: 12,
        padding: 15,
        minHeight: 200,
        fontSize: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.border,
        flex: 1,
    },
    submitBtn: { backgroundColor: Colors.brandInk, paddingVertical: 16, ...Radius.button, alignItems: 'center', marginTop: 8 },
    submitBtnDisabled: { opacity: 0.6 },
    submitText: { color: Colors.brandHoney, fontSize: 16, fontWeight: 'bold' },
});
