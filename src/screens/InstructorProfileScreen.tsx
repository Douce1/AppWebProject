import { Colors, Radius, Shadows } from '@/constants/theme';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, Modal, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Phone, MapPin, Camera, UserCircle, GraduationCap, Plus, Trash2, ChevronDown, Mail } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useProfile } from '../context/ProfileContext';
import { REGION_SIDO_GU } from '../data/regionData';
import { apiClient } from '../api/apiClient';
import { putJson } from '@/src/api/httpClient';

const SIDO_LIST = REGION_SIDO_GU.map((r) => r.sido);

/** 학력 표시 포맷: "학교명 전공, 졸업연도" */
const formatEducation = (school: string, major: string, year: string) =>
  [school.trim(), major.trim(), year.trim()].filter(Boolean).join(', ');

/** 한 줄 입력된 학교/전공/졸업연도로 파싱 (끝에 4자리 숫자 = 연도, 그 앞 = 전공, 나머지 = 학교) */
function parseEducationLine(text: string): { schoolName: string; major: string; graduationYear: string } {
  const parts = text.split(',').map((p) => p.trim());
  let graduationYear = '';
  let major = '';
  let schoolName = '';

  const yearIndex = parts.reduce<number>(
    (idx, p, i) => (/^\d{4}$/.test(p) ? i : idx),
    -1
  );
  if (yearIndex >= 0) {
    graduationYear = parts[yearIndex];
    if (yearIndex > 0) major = parts[yearIndex - 1];
    if (yearIndex > 1) schoolName = parts.slice(0, yearIndex - 1).join(', ');
    else if (yearIndex === 1) schoolName = parts[0];
  } else if (parts.length >= 2) {
    schoolName = parts.slice(0, -1).join(', ');
    major = parts[parts.length - 1];
  } else if (parts.length === 1) {
    schoolName = parts[0];
  }

  return { schoolName, major, graduationYear };
}

export default function InstructorProfileScreen() {
  const { education, setEducation, certifications, setCertifications } = useProfile();

  const [photoUri, setPhotoUri] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [savedProfile, setSavedProfile] = useState({
    photoUri: '',
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [savedCertifications, setSavedCertifications] = useState<
    { id: string; name: string; year: string }[]
  >([]);

  const [schoolName, setSchoolName] = useState(education?.schoolName ?? '');
  const [major, setMajor] = useState(education?.major ?? '');
  const [graduationYear, setGraduationYear] = useState(education?.graduationYear ?? '');
  const [certName, setCertName] = useState('');
  const [certYear, setCertYear] = useState('');
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);

  /** 학력 한 줄 문자열 (표시/입력용) */
  const educationLine = formatEducation(schoolName, major, graduationYear);

  const setEducationFromLine = (line: string) => {
    const { schoolName: s, major: m, graduationYear: y } = parseEducationLine(line);
    setSchoolName(s);
    setMajor(m);
    setGraduationYear(y);
  };

  useEffect(() => {
    setSchoolName(education?.schoolName ?? '');
    setMajor(education?.major ?? '');
    setGraduationYear(education?.graduationYear ?? '');
  }, [education]);

  // 초기 진입 시 백엔드 프로필을 불러와서 필드 초기화
  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const profile = await apiClient.getInstructorProfile();
        if (!mounted) return;

        setName(profile.name ?? '');
        setEmail(profile.email ?? '');
        setPhone(profile.phone ?? '');
        // residenceArea는 주소(시도)로 사용
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyProfile = profile as any;
        setAddress(anyProfile.residenceArea ?? '');

        const edu = anyProfile.education as
          | { schoolName?: string; major?: string; graduationYear?: string }
          | null
          | undefined;
        if (edu) {
          const eduState = {
            schoolName: edu.schoolName ?? '',
            major: edu.major ?? '',
            graduationYear: edu.graduationYear ?? '',
          };
          setEducation(eduState);
          setSchoolName(eduState.schoolName);
          setMajor(eduState.major);
          setGraduationYear(eduState.graduationYear);
        }

        const backendCerts = (anyProfile.certifications ??
          []) as { id: string; name: string; year: string }[];
        if (backendCerts.length > 0) {
          const mapped = backendCerts.map((c) => ({
            id: c.id,
            name: c.name,
            year: c.year,
          }));
          setCertifications(mapped);
          setSavedCertifications(mapped);
        } else {
          setCertifications([]);
          setSavedCertifications([]);
        }

        setSavedProfile({
          photoUri: '', // photoUrl은 현재 UI에서 사용 안 함
          name: profile.name ?? '',
          email: profile.email ?? '',
          phone: profile.phone ?? '',
          address: anyProfile.residenceArea ?? '',
        });
      } catch (error) {
        // 프로필을 못 불러와도 화면은 빈 상태로 유지
        // eslint-disable-next-line no-console
        console.log('[InstructorProfileScreen] failed to load profile', error);
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [setCertifications, setEducation]);

  const certificationsKey = certifications
    .map((c) => `${c.id}|${c.name}|${c.year}`)
    .join(';');
  const savedCertificationsKey = savedCertifications
    .map((c) => `${c.id}|${c.name}|${c.year}`)
    .join(';');
  const hasCertificationChanges = certificationsKey !== savedCertificationsKey;

  const isDirty =
    photoUri !== savedProfile.photoUri ||
    name !== savedProfile.name ||
    email !== savedProfile.email ||
    phone !== savedProfile.phone ||
    address !== savedProfile.address ||
    education?.schoolName !== schoolName.trim() ||
    education?.major !== major.trim() ||
    education?.graduationYear !== graduationYear.trim() ||
    hasCertificationChanges;

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

  const handleSave = async () => {
    const nextProfile = { photoUri, name, email, phone, address };

    // 백엔드 UpdateMyInstructorProfileDto 형태에 맞춰 payload 구성
    const payload: {
      name: string;
      email: string;
      phone: string;
      residenceArea: string;
      education:
        | {
            schoolName: string;
            major: string;
            graduationYear: string;
          }
        | null;
      certifications?: { id: string; name: string; year: string }[];
    } = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      residenceArea: address.trim(),
      education: null,
    };

    if (schoolName.trim() || major.trim() || graduationYear.trim()) {
      payload.education = {
        schoolName: schoolName.trim(),
        major: major.trim(),
        graduationYear: graduationYear.trim(),
      };
    }

    if (certifications.length > 0) {
      payload.certifications = certifications.map((c) => ({
        id: c.id,
        name: c.name,
        year: c.year,
      }));
    }

    try {
      await putJson('/instructors/me', payload);

      setSavedProfile(nextProfile);
      setSavedCertifications(certifications);
      if (schoolName.trim()) {
        setEducation({
          schoolName: schoolName.trim(),
          major: major.trim(),
          graduationYear: graduationYear.trim(),
        });
      } else {
        setEducation(null);
      }
      Alert.alert('저장 완료', '프로필이 저장되었습니다.');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('[InstructorProfileScreen] failed to save profile', error);
      Alert.alert('저장 실패', '프로필 저장 중 오류가 발생했습니다.');
    }
  };

  const addCertification = () => {
    if (!certName.trim()) return;
    setCertifications([
      ...certifications,
      { id: Date.now().toString(), name: certName.trim(), year: certYear.trim() },
    ]);
    setCertName('');
    setCertYear('');
  };

  const removeCertification = (id: string) => {
    setCertifications(certifications.filter((c) => c.id !== id));
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        viewIsInsideTabBar
        extraScrollHeight={120}
        extraHeight={Platform.OS === 'ios' ? 100 : 80}
      >
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
            <Text style={styles.subLabel}>프로필 사진 탭하여 변경</Text>

            <View style={styles.divider} />

            <View style={styles.fieldRow}>
              <UserCircle color={Colors.brandInk} size={20} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="이름"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.fieldRow}>
              <Mail color={Colors.brandInk} size={20} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="이메일"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.fieldRow}>
              <Phone color={Colors.brandInk} size={20} />
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
              <MapPin color={Colors.brandInk} size={20} />
              <TouchableOpacity
                style={styles.addressCombo}
                onPress={() => setAddressDropdownOpen(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.addressComboText, !address && styles.addressComboPlaceholder]}>
                  {address || '시도 선택'}
                </Text>
                <ChevronDown color="#6B7280" size={20} />
              </TouchableOpacity>
            </View>

            <Modal
              visible={addressDropdownOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setAddressDropdownOpen(false)}
            >
              <Pressable style={styles.modalBackdrop} onPress={() => setAddressDropdownOpen(false)}>
                <View style={styles.dropdownList}>
                  {SIDO_LIST.map((sido) => (
                    <TouchableOpacity
                      key={sido}
                      style={[styles.dropdownItem, address === sido && styles.dropdownItemSelected]}
                      onPress={() => {
                        setAddress(sido);
                        setAddressDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, address === sido && styles.dropdownItemTextSelected]}>
                        {sido}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Pressable>
            </Modal>

            <View style={styles.divider} />
            <Text style={styles.subSectionTitle}>학력</Text>
            <View style={styles.fieldRow}>
              <GraduationCap color={Colors.brandInk} size={20} />
              <TextInput
                style={[styles.input, styles.educationSingleInput]}
                value={educationLine}
                onChangeText={setEducationFromLine}
                placeholder="학교명 전공, 졸업연도"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.subSectionTitle}>자격증</Text>
            <View style={styles.certRow}>
              <TextInput
                style={[styles.input, styles.certNameInput]}
                value={certName}
                onChangeText={setCertName}
                placeholder="자격증명"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={[styles.input, styles.certYearInput]}
                value={certYear}
                onChangeText={setCertYear}
                placeholder="취득연도"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
              />
              <TouchableOpacity style={styles.addCertButton} onPress={addCertification}>
                <Plus color={Colors.brandInk} size={20} />
              </TouchableOpacity>
            </View>
            {certifications.map((item) => (
              <View key={item.id} style={styles.tagRow}>
                <Text style={styles.tagText}>
                  {item.name} ({item.year})
                </Text>
                <TouchableOpacity onPress={() => removeCertification(item.id)}>
                  <Trash2 color="#9CA3AF" size={18} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.saveButton, !isDirty && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!isDirty}
            >
              <Text style={styles.saveButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 320 },
  card: { margin: 16, backgroundColor: 'white', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 },
  cardInner: { alignItems: 'center' },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  avatarBadge: { position: 'absolute', right: 0, bottom: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.brandInk, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#F3F4F6', alignSelf: 'stretch', marginVertical: 16 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Radius.button,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  educationSingleInput: { flex: 1, minWidth: 0 },
  input: { flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 15, color: '#374151' },
  subSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#6B7280', alignSelf: 'stretch', marginTop: 8, marginBottom: 8 },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Radius.button,
    paddingHorizontal: 12,
    marginBottom: 8,
    minHeight: 48,
  },
  certNameInput: { flex: 1, minWidth: 0 },
  certYearInput: { width: 72, marginLeft: 8 },
  addCertButton: {
    backgroundColor: Colors.brandHoney,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  tagRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: Colors.surfaceSoft, borderRadius: 8, marginBottom: 6 },
  tagText: { fontSize: 14, color: '#374151', flex: 1 },
  addressCombo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingLeft: 8 },
  addressComboText: { fontSize: 15, color: '#374151' },
  addressComboPlaceholder: { color: '#9CA3AF' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', paddingHorizontal: 24 },
  dropdownList: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', maxHeight: 360 },
  dropdownItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemSelected: { backgroundColor: Colors.surfaceSoft },
  dropdownItemText: { fontSize: 15, color: '#374151' },
  dropdownItemTextSelected: { color: Colors.brandInk, fontWeight: '700' },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: Colors.brandHoney,
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 24,
    ...Radius.button,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: { backgroundColor: '#E5E7EB' },
  saveButtonText: { color: Colors.brandInk, fontSize: 16, fontWeight: 'bold' },
});
