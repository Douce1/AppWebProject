import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import { Mail, Phone, MapPin, Camera, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

// 샘플 데이터
const SAMPLE_PROFILE = {
  photoUri: '' as string,
  name: '김태완',
  email: 'kim.taewan@example.com',
  phone: '010-1234-5678',
  address: '서울시 강남구 테헤란로 123 메가스터디빌딩 4층',
};
type Profile = typeof SAMPLE_PROFILE;

export default function InstructorProfileScreen() {
  const [photoUri, setPhotoUri] = useState(SAMPLE_PROFILE.photoUri);
  const [name, setName] = useState(SAMPLE_PROFILE.name);
  const [email, setEmail] = useState(SAMPLE_PROFILE.email);
  const [phone, setPhone] = useState(SAMPLE_PROFILE.phone);
  const [address, setAddress] = useState(SAMPLE_PROFILE.address);
  const [savedProfile, setSavedProfile] = useState<Profile>(SAMPLE_PROFILE);

  const isDirty =
    photoUri !== savedProfile.photoUri ||
    name !== savedProfile.name ||
    email !== savedProfile.email ||
    phone !== savedProfile.phone ||
    address !== savedProfile.address;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    const nextProfile: Profile = { photoUri, name, email, phone, address };
    setSavedProfile(nextProfile);
    Alert.alert('저장 완료', '프로필이 저장되었습니다.');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Camera color="#9CA3AF" size={32} />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Camera color="#fff" size={14} />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{name} 강사님</Text>
          <Text style={styles.subLabel}>프로필 사진을 탭하여 변경</Text>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <User color="#4F46E5" size={20} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="이름"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.fieldRow}>
            <Mail color="#4F46E5" size={20} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="이메일"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
            />
          </View>
          <View style={styles.fieldRow}>
            <Phone color="#4F46E5" size={20} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="전화번호"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.fieldRow}>
            <MapPin color="#4F46E5" size={20} />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={address}
              onChangeText={setAddress}
              placeholder="주소"
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, !isDirty && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!isDirty}
          >
            <Text style={styles.saveButtonText}>저장</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  card: { margin: 16, backgroundColor: 'white', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 },
  cardInner: { alignItems: 'center' },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  avatarBadge: { position: 'absolute', right: 0, bottom: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#F3F4F6', alignSelf: 'stretch', marginVertical: 16 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 15, color: '#374151' },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#4F46E5', alignSelf: 'stretch', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  saveButtonDisabled: { backgroundColor: '#E5E7EB' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
