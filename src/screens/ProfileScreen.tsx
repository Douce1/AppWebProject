import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, UserCircle, Settings, ChevronRight } from 'lucide-react-native';

export default function ProfileScreen() {
    const router = useRouter();
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.profileInfo}>
                    <View style={styles.avatarPlaceholder} />
                    <View>
                        <Text style={styles.nameText}>김태완 강사님</Text>
                        <Text style={styles.subText}>메가강남본원 소속</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>설정</Text>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/profile/availability')}>
                    <View style={styles.menuIconContainer}>
                        <Clock color="#4F46E5" size={20} />
                    </View>
                    <Text style={styles.menuText}>가용시간 설정</Text>
                    <ChevronRight color="#CBD5E1" size={20} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/profile/instructor')}>
                    <View style={styles.menuIconContainer}>
                        <UserCircle color="#4F46E5" size={20} />
                    </View>
                    <Text style={styles.menuText}>강사 프로필 설정</Text>
                    <ChevronRight color="#CBD5E1" size={20} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/profile/settings')}>
                    <View style={styles.menuIconContainer}>
                        <Settings color="#4F46E5" size={20} />
                    </View>
                    <Text style={styles.menuText}>앱 설정</Text>
                    <ChevronRight color="#CBD5E1" size={20} />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    profileInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E0E7FF', marginRight: 15 },
    nameText: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    subText: { fontSize: 14, color: '#6B7280' },
    section: { padding: 20, marginTop: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#6B7280', marginBottom: 15 },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
    menuIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    menuText: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500' },
});
