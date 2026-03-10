import { Colors, Radius, Shadows } from '@/constants/theme';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Bell, ChevronLeft, FileText, Info, LogOut, Shield } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { clearTokens } from '../store/authStore';

const PUSH_NOTIFICATIONS_KEY = 'pushNotificationsEnabled';
const APP_VERSION = '1.0.0';

export default function AppSettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const loadPushSetting = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await SecureStore.getItemAsync(PUSH_NOTIFICATIONS_KEY);
      setNotificationsEnabled(stored !== 'false');
    } catch {
      setNotificationsEnabled(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPushSetting();
  }, [loadPushSetting]);

  useEffect(() => {
    navigation.setOptions({
      headerBackTitle: ' ',
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}>
          <ChevronLeft size={28} color="#4F46E5" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router]);

  const handlePushToggle = async (value: boolean) => {
    const prev = notificationsEnabled;
    setNotificationsEnabled(value);
    try {
      await SecureStore.setItemAsync(PUSH_NOTIFICATIONS_KEY, value ? 'true' : 'false');
    } catch {
      setNotificationsEnabled(prev);
      Alert.alert('저장 실패', '푸시 알림 설정을 저장하지 못했습니다. 다시 시도해주세요.');
    }
  };

  const handleConfirmLogout = async () => {
    try {
      await clearTokens();
      router.replace('/login');
    } catch {
      Alert.alert('로그아웃 실패', '로그아웃 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => { void handleConfirmLogout(); } },
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
            onValueChange={handlePushToggle}
            disabled={loading}
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
          <Text style={styles.chevron}>{'>'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => openLink('https://example.com/privacy')}>
          <View style={styles.rowIcon}>
            <Shield color="#4F46E5" size={22} />
          </View>
          <Text style={styles.rowLabel}>개인정보 처리방침</Text>
          <Text style={styles.chevron}>{'>'}</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Info color="#4F46E5" size={22} />
          </View>
          <Text style={styles.rowLabel}>앱 버전</Text>
          <Text style={styles.versionText}>{`v${APP_VERSION}`}</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  section: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },
  chevron: { fontSize: 18, color: '#9CA3AF' },
  versionText: { fontSize: 14, color: '#6B7280' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#DC2626', marginHorizontal: 16, marginTop: 32, marginBottom: 40, padding: 16, borderRadius: 12 },
  logoutButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});
