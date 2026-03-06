import { useProfile } from '@/src/context/ProfileContext';
import { apiClient } from '@/src/api/apiClient';
import type { ApiCompany, ApiInstructorProfile } from '@/src/api/types';
import { useRouter } from 'expo-router';
import { Briefcase, Camera, ChevronRight, Clock, MapPin, Settings, UserCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { selectedRegions } = useProfile();
    const regionSummary = selectedRegions.length > 0 ? selectedRegions.join(', ') : null;

    const [instructor, setInstructor] = useState<ApiInstructorProfile | null>(null);
    const [company, setCompany] = useState<ApiCompany | null>(null);

    useEffect(() => {
        let mounted = true;
        Promise.all([apiClient.getInstructorProfile(), apiClient.getCompany()])
            .then(([profile, companyInfo]) => {
                if (!mounted) return;
                setInstructor(profile);
                setCompany(companyInfo);
            })
            .catch(() => {
                // 실패 시에는 샘플 텍스트 대신 최소한의 기본 문구만 표시
                if (!mounted) return;
                setInstructor(null);
                setCompany(null);
            });
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <ScrollView style={[styles.container, { paddingTop: Math.max(50, insets.top) }]}>
            {/* Top Bar - 대시보드와 동일한 디자인/위치 */}
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>내 정보</Text>
                <View style={styles.topBarIcons}>
                    <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.settingsIconContainer}>
                        <Settings color="#666" size={26} />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.header}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push('/(tabs)/profile/instructor')}
                    style={styles.profileCard}
                >
                    <View style={styles.profileInfo}>
                        <View style={styles.avatarWrapper}>
                            <View style={styles.avatarPlaceholder}>
                                <Camera color="#9CA3AF" size={28} />
                            </View>
                            <View style={styles.avatarBadge}>
                                <Camera color="#ffffff" size={16} />
                            </View>
                        </View>
                        <View style={styles.profileTextWrap}>
                            <Text style={styles.nameText}>
                                {instructor ? `${instructor.name} 강사님` : '강사님'}
                            </Text>
                            {company && (
                                <Text style={styles.subText}>{company.name} 소속</Text>
                            )}
                            <Text style={styles.helperText}>프로필 사진을 탭하여 변경</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>설정</Text>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/profile/instructor')}>
                    <View style={styles.menuIconContainer}>
                        <UserCircle color="#4F46E5" size={20} />
                    </View>
                    <Text style={styles.menuText}>강사 프로필 설정</Text>
                    <ChevronRight color="#CBD5E1" size={20} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/profile/availability')}>
                    <View style={styles.menuIconContainer}>
                        <Clock color="#4F46E5" size={20} />
                    </View>
                    <Text style={styles.menuText}>가용시간 설정</Text>
                    <ChevronRight color="#CBD5E1" size={20} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/profile/career')}>
                    <View style={styles.menuIconContainer}>
                        <Briefcase color="#4F46E5" size={20} />
                    </View>
                    <Text style={styles.menuText}>강의 이력</Text>
                    <ChevronRight color="#CBD5E1" size={20} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/profile/region')}>
                    <View style={styles.menuIconContainer}>
                        <MapPin color="#4F46E5" size={20} />
                    </View>
                    <View style={styles.menuTextWrap}>
                        <Text style={styles.menuText}>희망 지역</Text>
                        {regionSummary ? <Text style={styles.regionSummary}>요약: {regionSummary}</Text> : null}
                    </View>
                    <ChevronRight color="#CBD5E1" size={20} />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 15 },
    topBarTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', lineHeight: 32 },
    topBarIcons: { flexDirection: 'row', alignItems: 'center' },
    settingsIconContainer: { padding: 8 },
    header: { paddingHorizontal: 15, paddingBottom: 20 },
    profileCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(79, 70, 229, 0.08)',
    },
    profileInfo: { flexDirection: 'row', alignItems: 'center' },
    profileTextWrap: { flex: 1 },
    avatarWrapper: { marginRight: 18 },
    avatarPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#E0E7FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#C7D2FE',
    },
    avatarBadge: {
        position: 'absolute',
        right: -2,
        bottom: -2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    nameText: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 6, letterSpacing: -0.3 },
    subText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
    helperText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
    section: { paddingHorizontal: 15, paddingVertical: 20, marginTop: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#6B7280', marginBottom: 15 },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
    menuIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    menuText: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },
    menuTextWrap: { flex: 1 },
    regionSummary: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
