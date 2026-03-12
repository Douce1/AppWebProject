import { Colors, Radius, Shadows } from '@/constants/theme';
import { API_BASE_URL } from '@/src/api/httpClient';
import { SignaturePad } from '@/src/components/molecules/SignaturePad';
import { useSignatureAssetQuery, useUploadSignatureMutation } from '@/src/query/hooks';
import { getAccessToken } from '@/src/store/authStore';
import { File, Paths } from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SignatureSettingScreen() {
  const { data: signatureAsset, isLoading } = useSignatureAssetQuery();
  const uploadMutation = useUploadSignatureMutation();
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    getAccessToken().then(setAccessToken);
  }, []);

  const handleSave = async () => {
    if (!pendingSignature) return;
    try {
      const base64 = pendingSignature.split(',')[1];
      const tempFile = new File(Paths.cache, 'signature_upload.png');
      // Decode base64 to Uint8Array and write
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      tempFile.write(bytes);
      await uploadMutation.mutateAsync(tempFile.uri);
      setPendingSignature(null);
      setAccessToken(await getAccessToken());
      Alert.alert('저장 완료', '서명 이미지가 저장되었습니다.');
    } catch {
      Alert.alert('저장 실패', '서명 이미지를 저장하지 못했습니다. 다시 시도해주세요.');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.brandHoney} />
      </View>
    );
  }

  const currentSignatureSource =
    signatureAsset && accessToken
      ? {
          uri: `${API_BASE_URL}${signatureAsset.fileUrl}`,
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      : null;

  return (
    <View style={styles.container}>
      {/* 현재 서명 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>현재 등록된 서명</Text>
        <View style={styles.previewCard}>
          {currentSignatureSource ? (
            <Image
              source={currentSignatureSource}
              style={styles.signatureImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.emptyText}>등록된 서명이 없습니다</Text>
          )}
        </View>
      </View>

      {/* 새 서명 미리보기 */}
      {pendingSignature ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>새 서명 미리보기</Text>
          <View style={styles.previewCard}>
            <Image
              source={{ uri: pendingSignature }}
              style={styles.signatureImage}
              resizeMode="contain"
            />
          </View>
        </View>
      ) : null}

      {/* 서명 캔버스 */}
      <View style={styles.padSection}>
        <Text style={styles.sectionTitle}>새 서명 그리기</Text>
        <Text style={styles.hint}>서명 완료 후 하단 저장 버튼을 눌러주세요</Text>
        <SignaturePad
          onOK={setPendingSignature}
          descriptionText="아래 영역에 서명해 주세요"
          confirmText="서명 완료"
        />
      </View>

      {/* 저장 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!pendingSignature || uploadMutation.isPending) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!pendingSignature || uploadMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {uploadMutation.isPending ? '저장 중...' : '저장'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  padSection: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  previewCard: {
    backgroundColor: 'white',
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    ...Shadows.card,
  },
  signatureImage: { width: '100%', height: '100%' },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.brandHoney,
    padding: 16,
    ...Radius.button,
    alignItems: 'center',
  },
  saveButtonDisabled: { backgroundColor: Colors.border, opacity: 0.6 },
  saveButtonText: { color: Colors.brandInk, fontSize: 16, fontWeight: 'bold' },
});
