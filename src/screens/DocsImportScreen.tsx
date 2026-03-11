import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Camera, Image as ImageIcon, X, ChevronRight, FileText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
// eslint-disable-next-line import/no-unresolved
import * as DocumentPicker from 'expo-document-picker';
// eslint-disable-next-line import/no-unresolved
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { httpClient } from '@/src/api/httpClient';

export default function DocsImportScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [ocrFailed, setOcrFailed] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isPdf, setIsPdf] = useState(false);
    const [pdfFileName, setPdfFileName] = useState('');

    const pickImage = async (useCamera: boolean) => {
        try {
            let result;
            if (useCamera) {
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                if (permissionResult.granted === false) {
                    Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    quality: 0.8,
                });
            } else {
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (permissionResult.granted === false) {
                    Alert.alert('권한 필요', '사진첩 접근 권한이 필요합니다.');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.8,
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setImageUri(result.assets[0].uri);
                setOcrFailed(false);
                setErrorMessage('');
                setIsPdf(false);
                setPdfFileName('');
            }
        } catch (error) {
            console.error('Image picking error:', error);
            Alert.alert('오류', '이미지를 불러오는 중 문제가 발생했습니다.');
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setImageUri(result.assets[0].uri);
                setIsPdf(true);
                setPdfFileName(result.assets[0].name);
                setOcrFailed(false);
                setErrorMessage('');
            }
        } catch (error) {
            console.error('Document picking error:', error);
            Alert.alert('오류', '문서를 불러오는 중 문제가 발생했습니다.');
        }
    };

    const handleNext = async () => {
        if (!imageUri) return;

        setIsUploading(true);
        try {
            let extractedText = '';

            if (!isPdf) {
                const recognizeResult = await TextRecognition.recognize(imageUri);
                extractedText = recognizeResult.text?.trim() || '';

                if (!extractedText) {
                    setOcrFailed(true);
                    setErrorMessage('이미지에서 글자를 찾을 수 없습니다.\n다시 촬영하시거나 직접 입력해주세요.');
                    setIsUploading(false);
                    return;
                }
            }

            // 1) Upload image/document to get documentId
            const mimeType = isPdf ? 'application/pdf' : 'image/jpeg';
            const fileName = isPdf ? (pdfFileName || 'document.pdf') : 'document.jpg';
            const documentType = isPdf ? 'CONTRACT_PDF' : 'CONTRACT_IMAGE';
            const doc = await httpClient.uploadDocument(imageUri, mimeType, fileName, documentType);

            // 2) Send to the parsing API (server takes care of PDF text extraction if ocrText is omitted)
            await httpClient.extractDocumentDraft(doc.documentId, { ocrText: extractedText || undefined });

            // Move to review screen with documentId
            router.push(`/docs/review?documentId=${doc.documentId}&imageUri=${encodeURIComponent(imageUri)}` as any);
        } catch (error: any) {
            console.error('OCR/Upload error:', error);
            setOcrFailed(true);

            const errMsg = error?.message || '';
            if (errMsg.includes("doesn't seem to be linked") || errMsg.includes("Expo managed workflow")) {
                setErrorMessage('기본 Expo 앱 환경에서는 자동 텍스트 추출이 지원되지 않습니다.\n앱을 빌드하거나, 아래 버튼을 눌러 직접 정보를 입력해주세요.');
            } else {
                setErrorMessage(errMsg || '문서 처리 중 문제가 발생했습니다.\n다시 촬영하시거나 직접 입력해주세요.');
            }
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <X color="#111" size={24} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>문서로 일정 만들기</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.contentScroll}
                contentContainerStyle={styles.contentScrollContainer}
            >
                <Text style={styles.headerTitle}>외부 계약 등록</Text>
                <Text style={styles.headerSubtitle}>
                    문서 이미지를 업로드하면 자동으로 내용을 스캔하여 일정을 생성합니다.
                </Text>

                {imageUri ? (
                    <View style={styles.imagePreviewContainer}>
                        {isPdf ? (
                            <View style={styles.pdfPreview}>
                                <FileText color={Colors.brandInk} size={64} style={{ marginBottom: 16 }} />
                                <Text style={styles.pdfFileName}>{pdfFileName}</Text>
                                <Text style={styles.pdfFileDesc}>PDF/문서는 자동 텍스트 추출이 제한될 수 있습니다. 다음 단계에서 필요한 내용을 직접 입력해주세요.</Text>
                            </View>
                        ) : (
                            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
                        )}

                        {ocrFailed ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{errorMessage}</Text>
                                <View style={styles.errorActionRow}>
                                    <TouchableOpacity style={styles.retakeButtonSmall} onPress={() => { setOcrFailed(false); setImageUri(null); }}>
                                        <Text style={styles.retakeButtonTextSmall}>다시 선택하기</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.manualEntryButton} onPress={() => router.push('/docs/review' as any)}>
                                        <Text style={styles.manualEntryButtonText}>직접 입력하기</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.retakeButton} onPress={() => setImageUri(null)}>
                                <Text style={styles.retakeButtonText}>다시 선택하기</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={styles.actionContainer}>
                        <TouchableOpacity style={styles.actionCard} onPress={() => pickImage(true)}>
                            <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
                                <Camera color={Colors.brandInk} size={28} />
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionTitle}>카메라 촬영</Text>
                                <Text style={styles.actionDesc}>계약서 사진을 바로 찍어 올립니다.</Text>
                            </View>
                            <ChevronRight color="#CBD5E1" size={20} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCard} onPress={() => pickImage(false)}>
                            <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
                                <ImageIcon color="#9333EA" size={28} />
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionTitle}>사진첩 선택</Text>
                                <Text style={styles.actionDesc}>앨범에 저장된 이미지를 불러옵니다.</Text>
                            </View>
                            <ChevronRight color="#CBD5E1" size={20} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCard} onPress={pickDocument}>
                            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                                <FileText color="#D97706" size={28} />
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionTitle}>PDF/문서 업로드</Text>
                                <Text style={styles.actionDesc}>기기에 저장된 PDF 파일 등을 불러옵니다.</Text>
                            </View>
                            <ChevronRight color="#CBD5E1" size={20} />
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
                <TouchableOpacity
                    style={[styles.nextButton, (!imageUri || isUploading) && styles.nextButtonDisabled]}
                    disabled={!imageUri || isUploading}
                    onPress={handleNext}
                >
                    {isUploading ? (
                        <ActivityIndicator color={Colors.brandHoney} size="small" />
                    ) : (
                        <Text style={styles.nextButtonText}>스캔 시작하기</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 15 },
    backButton: { padding: 4 },
    topBarTitle: { fontSize: 17, fontWeight: 'bold', color: '#111' },
    contentScroll: { flex: 1 },
    contentScrollContainer: { paddingHorizontal: 20, paddingTop: 10 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111', marginBottom: 8 },
    headerSubtitle: { fontSize: 15, color: '#64748B', lineHeight: 22, marginBottom: 24 },
    actionContainer: { marginTop: 30, gap: 16 },
    actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.card },
    actionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    actionTextContainer: { flex: 1 },
    actionTitle: { fontSize: 17, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
    actionDesc: { fontSize: 13, color: '#64748B' },
    imagePreviewContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 24, paddingBottom: 20 },
    imagePreview: { width: '100%', height: '70%', borderRadius: 16, backgroundColor: '#F8FAFC' },
    pdfPreview: { width: '100%', height: '70%', borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 24 },
    pdfFileName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginBottom: 12 },
    pdfFileDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
    retakeButton: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#F1F5F9' },
    retakeButtonText: { color: '#475569', fontWeight: 'bold', fontSize: 14 },
    errorContainer: { marginTop: 16, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 12, width: '100%', borderWidth: 1, borderColor: '#FEE2E2', alignItems: 'center' },
    errorText: { color: '#DC2626', fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
    errorActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
    retakeButtonSmall: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#FEE2E2', alignItems: 'center' },
    retakeButtonTextSmall: { color: '#DC2626', fontWeight: '600', fontSize: 14 },
    manualEntryButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: Colors.brandInk, alignItems: 'center' },
    manualEntryButtonText: { color: Colors.brandHoney, fontWeight: 'bold', fontSize: 14 },
    bottomBar: { paddingHorizontal: 20, paddingTop: 16, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    nextButton: { backgroundColor: Colors.brandInk, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    nextButtonDisabled: { backgroundColor: '#CBD5E1' },
    nextButtonText: { color: Colors.brandHoney, fontSize: 16, fontWeight: 'bold' },
});
