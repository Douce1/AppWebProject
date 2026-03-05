import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, UserCircle, ChevronRight, Briefcase, MapPin } from 'lucide-react-native';
import { useProfile } from '@/src/context/ProfileContext';

export default function ProfileScreen() {
    const router = useRouter();
    const { selectedRegions } = useProfile();
    const regionSummary = selectedRegions.length > 0 ? selectedRegions.join(', ') : null;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.profileCard}>
                    <View style={styles.profileInfo}>
                        <View style={styles.avatarPlaceholder} />
                        <View style={styles.profileTextWrap}>
                            <Text style={styles.nameText}>김태완 강사님</Text>
                            <Text style={styles.subText}>메가강남본원 소속</Text>
                        </View>
                    </View>
                </View>
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
    header: { paddingTop: 48, paddingHorizontal: 20, paddingBottom: 20 },
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
    avatarPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#E0E7FF',
        marginRight: 18,
        borderWidth: 3,
        borderColor: '#C7D2FE',
    },
    nameText: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 6, letterSpacing: -0.3 },
    subText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
    section: { padding: 20, marginTop: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#6B7280', marginBottom: 15 },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
    menuIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    menuText: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },
    menuTextWrap: { flex: 1 },
    regionSummary: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
