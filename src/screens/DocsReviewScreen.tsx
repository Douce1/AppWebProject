import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { X, AlertTriangle } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { httpClient } from '@/src/api/httpClient';
import type { ApiDocumentDraft } from '@/src/api/types';
import { useSchedule } from '../context/ScheduleContext';

function getSingleParam(
    value: string | string[] | undefined,
): string | undefined {
    return typeof value === 'string'
        ? value
        : Array.isArray(value)
          ? value[0]
          : undefined;
}

function toEditableDateTime(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    return value.replace('T', ' ').trim().slice(0, 16);
}

export default function DocsReviewScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{
        documentId?: string | string[];
        imageUri?: string | string[];
    }>();
    
    const { fetchLessons, classes } = useSchedule();
    const documentId = getSingleParam(params.documentId);
    const imageUri = getSingleParam(params.imageUri);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Mock initial state since the backend isn't ready. When backend is ready, 
    // we would fetch the document's draft from the server if it wasn't returned earlier.
    const [draft, setDraft] = useState<ApiDocumentDraft>({
        lectureTitle: '',
        companyName: '',
        startsAt: '',
        endsAt: '',
        region: '',
        museum: '',
        payAmount: null,
    });

    useEffect(() => {
        if (!documentId) return;

        let mounted = true;
        const loadDocument = async () => {
            setIsLoading(true);
            try {
                const doc = await httpClient.getDocument(documentId);
                if (mounted && doc.draft && doc.draft.parsedJson) {
                    const parsed = doc.draft.parsedJson as ApiDocumentDraft;
                    setDraft({
                        lectureTitle: parsed.lectureTitle || '',
                        companyName: parsed.companyName || '',
                        startsAt: toEditableDateTime(parsed.startsAt),
                        endsAt: toEditableDateTime(parsed.endsAt),
                        region: parsed.region || '',
                        museum: parsed.museum || '',
                        payAmount: parsed.payAmount || null,
                    });
                }
            } catch (_error) {
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        loadDocument();

        return () => {
            mounted = false;
        };
    }, [documentId]);

    const [conflictWarning, setConflictWarning] = useState<string | null>(null);

    // Issue #51: Detect Schedule Overlaps
    useEffect(() => {
        if (!draft.startsAt || !draft.endsAt) {
            setConflictWarning(null);
            return;
        }

        try {
            const startParts = draft.startsAt.split(' ');
            const endParts = draft.endsAt.split(' ');
            if (startParts.length < 2 || endParts.length < 2) {
                setConflictWarning(null);
                return;
            }

            const draftDate = startParts[0]; // YYYY-MM-DD
            const draftStartTime = startParts[1]; // HH:mm
            const draftEndTime = endParts[1]; // HH:mm

            const conflict = classes.find(c => {
                if (c.date !== draftDate) return false;
                
                const classTimeParts = c.time.split('-');
                if (classTimeParts.length < 2) return false;

                const cStart = classTimeParts[0].trim();
                const cEnd = classTimeParts[1].trim();

                if (draftStartTime < cEnd && draftEndTime > cStart) {
                    return true;
                }
                return false;
            });

            if (conflict) {
                setConflictWarning(`경고: 일정이 기존 수업("${conflict.title}") 시간과 겹칩니다.`);
            } else {
                setConflictWarning(null);
            }
        } catch (e) {
            setConflictWarning(null);
        }
    }, [draft.startsAt, draft.endsAt, classes]);

    const formatDateTime = (text: string) => {
        // Remove all non-numeric characters
        const cleaned = text.replace(/[^0-9]/g, '');
        let formatted = cleaned;

        if (cleaned.length > 12) {
            formatted = cleaned.substring(0, 12);
        }

        // Apply YYYY-MM-DD HH:mm format
        if (formatted.length >= 5 && formatted.length < 7) {
            formatted = `${formatted.slice(0, 4)}-${formatted.slice(4)}`;
        } else if (formatted.length >= 7 && formatted.length < 9) {
            formatted = `${formatted.slice(0, 4)}-${formatted.slice(4, 6)}-${formatted.slice(6)}`;
        } else if (formatted.length >= 9 && formatted.length < 11) {
            formatted = `${formatted.slice(0, 4)}-${formatted.slice(4, 6)}-${formatted.slice(6, 8)} ${formatted.slice(8)}`;
        } else if (formatted.length >= 11) {
            formatted = `${formatted.slice(0, 4)}-${formatted.slice(4, 6)}-${formatted.slice(6, 8)} ${formatted.slice(8, 10)}:${formatted.slice(10, 12)}`;
        }
        
        return formatted;
    };

    const handleChange = (field: keyof ApiDocumentDraft, value: string) => {
        setDraft(prev => {
            let processedValue = value;
            if (field === 'payAmount') {
                processedValue = value ? parseInt(value.replace(/[^0-9]/g, '')) as any : null;
            } else if (field === 'startsAt' || field === 'endsAt') {
                processedValue = formatDateTime(value);
            }

            return {
                ...prev,
                [field]: processedValue
            };
        });
    };

    const handleSave = async () => {
        if (!documentId) {
            Alert.alert('등록 실패', '문서 ID가 없어 저장할 수 없습니다. 문서를 다시 업로드해주세요.');
            return;
        }

        if (!draft.lectureTitle || !draft.startsAt || !draft.endsAt) {
            Alert.alert('필수 입력', '강의명, 시작일시, 종료일시는 필수입니다.');
            return;
        }

        setIsSaving(true);
        try {
            await httpClient.updateDocumentDraft(documentId, draft);
            await httpClient.confirmDocument(documentId);
            
            // #47: reload the schedule after successful save
            await fetchLessons();
            
            Alert.alert('저장 완료', '일정이 성공적으로 등록되었습니다.', [
                {
                    text: '확인',
                    onPress: () => {
                        // Return to home completely
                        router.replace('/(tabs)');
                    }
                }
            ]);
        } catch (error: any) {
            console.error('Confirm error:', error);
            Alert.alert('등록 실패', error.message || '일정 확정 중 문제가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <X color="#111" size={24} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>일정 정보 확인</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {imageUri && (
                    <View style={styles.imageHeader}>
                        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                        <View style={styles.imageOverlay}>
                            <Text style={styles.imageOverlayText}>원본 이미지</Text>
                        </View>
                    </View>
                )}

                <View style={styles.formSection}>
                    <Text style={styles.sectionHeader}>추출 정보 수정</Text>
                    <Text style={styles.sectionSub}>잘못 추출된 정보가 있다면 직접 수정해주세요.</Text>

                    {conflictWarning && (
                        <View style={styles.warningContainer}>
                            <AlertTriangle color="#D97706" size={20} style={{ marginRight: 8 }} />
                            <Text style={styles.warningText}>{conflictWarning}</Text>
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>강의명 <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            value={draft.lectureTitle || ''}
                            onChangeText={(text) => handleChange('lectureTitle', text)}
                            placeholder="강의명 입력"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>시작 일시 <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                value={draft.startsAt || ''}
                                onChangeText={(text) => handleChange('startsAt', text)}
                                placeholder="YYYY-MM-DD HH:mm"
                                keyboardType="numeric"
                                maxLength={16}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>종료 일시 <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                value={draft.endsAt || ''}
                                onChangeText={(text) => handleChange('endsAt', text)}
                                placeholder="YYYY-MM-DD HH:mm"
                                keyboardType="numeric"
                                maxLength={16}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>기관명 (박물관)</Text>
                        <TextInput
                            style={styles.input}
                            value={draft.museum || ''}
                            onChangeText={(text) => handleChange('museum', text)}
                            placeholder="기관명 입력"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>소속 (회사/업체명) <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            value={draft.companyName || ''}
                            onChangeText={(text) => handleChange('companyName', text)}
                            placeholder="회사명/업체명 입력"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>지역</Text>
                            <TextInput
                                style={styles.input}
                                value={draft.region || ''}
                                onChangeText={(text) => handleChange('region', text)}
                                placeholder="예: 서울 강남구"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>강의료 (예상)</Text>
                            <TextInput
                                style={styles.input}
                                value={draft.payAmount ? draft.payAmount.toLocaleString() : ''}
                                onChangeText={(text) => handleChange('payAmount', text)}
                                placeholder="숫자만 입력"
                                keyboardType="numeric"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: Math.max(34, insets.bottom + 14) }]}>
                <TouchableOpacity 
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    disabled={isSaving}
                    onPress={handleSave}
                >
                    {isSaving ? (
                        <ActivityIndicator color={Colors.brandHoney} size="small" />
                    ) : (
                        <Text style={styles.saveButtonText}>일정 확정하기</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 15 },
    backButton: { padding: 4 },
    topBarTitle: { fontSize: 17, fontWeight: 'bold', color: '#111' },
    scrollContent: { paddingBottom: 40 },
    imageHeader: { width: '100%', height: 180, backgroundColor: '#E2E8F0', position: 'relative' },
    previewImage: { width: '100%', height: '100%' },
    imageOverlay: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    imageOverlayText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    formSection: { padding: 20 },
    sectionHeader: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
    sectionSub: { fontSize: 13, color: '#64748B', marginBottom: 20 },
    warningContainer: { backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A', marginBottom: 20 },
    warningText: { color: '#B45309', fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 },
    inputGroup: { marginBottom: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
    required: { color: '#EF4444' },
    input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, height: 48, fontSize: 15, color: '#0F172A' },
    bottomBar: { paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F1F5F9', ...Shadows.card },
    saveButton: { backgroundColor: Colors.brandInk, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    saveButtonDisabled: { opacity: 0.7 },
    saveButtonText: { color: Colors.brandHoney, fontSize: 16, fontWeight: 'bold' },
});
