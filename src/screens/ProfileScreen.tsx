import { Colors } from '@/constants/theme';
import { useProfile } from '@/src/context/ProfileContext';
import { apiClient } from '@/src/api/apiClient';
import type { ApiCompany, ApiInstructorProfile } from '@/src/api/types';
import { useRouter } from 'expo-router';
import { Briefcase, ChevronRight, Clock, MapPin, PenLine, Settings, UserCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileHero } from '@/src/components/organisms/ProfileHero';
import { NotificationTopBar } from '@/src/components/organisms/NotificationTopBar';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { selectedRegions } = useProfile();
    const regionSummary = selectedRegions.length > 0 ? selectedRegions.join(', ') : null;

    const [instructor, setInstructor] = useState<ApiInstructorProfile | null>(null);
    const [company, setCompany] = useState<ApiCompany | null>(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            const [instructorResult, companyResult] = await Promise.allSettled([
                apiClient.getInstructorProfile(),
                apiClient.getCompany(),
            ]);

            if (!mounted) return;

            if (instructorResult.status === 'fulfilled') {
                setInstructor(instructorResult.value);
            }

            if (companyResult.status === 'fulfilled') {
                setCompany(companyResult.value);
            }
            // 회사가 없어도 나머지 정보는 보여줄 수 있도록 company만 null 처리
        };

        void load();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <ScrollView style={[styles.container, { paddingTop: Math.max(50, insets.top) }]}>
            <NotificationTopBar title="내 정보" />

            <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/profile/instructor')}>
                <ProfileHero
                    name={instructor ? `${instructor.name} 강사님` : '강사님'}
                    role={company ? `${company.name} 소속` : '프리랜서'}
                    imageUrl={instructor?.photoUrl ?? undefined}
                    hint="프로필 사진 및 이름 변경"
                />
            </TouchableOpacity>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>설정</Text>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/instructor')}>
                    <View style={styles.menuIconContainer}>
                        <UserCircle color={Colors.brandInk} size={20} />
                    </View>
                    <Text style={styles.menuText}>강사 프로필 설정</Text>
                    <ChevronRight color="#CBD5E1" size={20} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/availability')}>
                    <View style={styles.menuIconContainer}>
                        <Clock color={Colors.brandInk} size={20} />
                    </View>
                    <Text style={styles.menuText}>가능시간 설정</Text>
                    <ChevronRight color="#CBD5E1" size={20} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/career')}>
                    <View style={styles.menuIconContainer}>
                        <Briefcase color={Colors.brandInk} size={20} />
                    </View>
                    <Text style={styles.menuText}>강의 이력</Text>
                    <ChevronRight color="#CBD5E1" size={20} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/signature')}>
                    <View style={styles.menuIconContainer}>
                        <PenLine color={Colors.brandInk} size={20} />
                    </View>
                    <Text style={styles.menuText}>서명 이미지 관리</Text>
                    <ChevronRight color="#CBD5E1" size={20} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/region')}>
                    <View style={styles.menuIconContainer}>
                        <MapPin color={Colors.brandInk} size={20} />
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
    container: { flex: 1, backgroundColor: Colors.background },
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
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, borderTopRightRadius: 0, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
    menuIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.brandCream, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    menuText: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },
    menuTextWrap: { flex: 1 },
    regionSummary: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
