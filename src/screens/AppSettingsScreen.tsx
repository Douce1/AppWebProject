import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Bell, FileText, Shield, Info, LogOut, ChevronLeft } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

// 샘플 데이터
const SAMPLE_SETTINGS = {
  notificationsEnabled: true,
  appVersion: '1.0.0',
};

export default function AppSettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(SAMPLE_SETTINGS.notificationsEnabled);
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.returnTo) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.replace(params.returnTo as any)} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}>
            <ChevronLeft size={28} color="#4F46E5" />
            <Text style={{ fontSize: 16, color: '#4F46E5', marginLeft: -4 }}>대시보드</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, params]);

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => Alert.alert('로그아웃 완료') },
    ]);
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('링크를 열 수 없습니다.'));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림</Text>
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Bell color="#4F46E5" size={22} />
          </View>
          <Text style={styles.rowLabel}>푸시 알림</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
            thumbColor={notificationsEnabled ? '#4F46E5' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>정보</Text>
        <TouchableOpacity style={styles.row} onPress={() => openLink('https://example.com/terms')}>
          <View style={styles.rowIcon}>
            <FileText color="#4F46E5" size={22} />
          </View>
          <Text style={styles.rowLabel}>서비스 이용약관</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => openLink('https://example.com/privacy')}>
          <View style={styles.rowIcon}>
            <Shield color="#4F46E5" size={22} />
          </View>
          <Text style={styles.rowLabel}>개인정보 처리방침</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Info color="#4F46E5" size={22} />
          </View>
          <Text style={styles.rowLabel}>앱 버전</Text>
          <Text style={styles.versionText}>{`v${SAMPLE_SETTINGS.appVersion}`}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut color="#fff" size={20} />
        <Text style={styles.logoutButtonText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  section: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },
  chevron: { fontSize: 18, color: '#9CA3AF' },
  versionText: { fontSize: 14, color: '#6B7280' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#DC2626', marginHorizontal: 16, marginTop: 32, marginBottom: 40, padding: 16, borderRadius: 12 },
  logoutButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});
