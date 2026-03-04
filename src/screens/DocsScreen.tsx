import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FileSignature, FileText } from 'lucide-react-native';

export default function DocsScreen() {
    const [selectedTab, setSelectedTab] = useState('서류');
    const tabs = ['서류', '계약'];

    return (
        <View style={styles.container}>
            {/* Top Tabs */}
            <View style={styles.tabContainer}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabButton, selectedTab === tab && styles.activeTabButton]}
                        onPress={() => setSelectedTab(tab)}
                    >
                        <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={styles.contentContainer}>
                {selectedTab === '서류' && (
                    <>
                        <View style={styles.todoBadgeContainer}>
                            <Text style={styles.todoBadgeText}>서명 필요 1건</Text>
                        </View>

                        <View style={styles.docCard}>
                            <View style={styles.docIcon}>
                                <FileSignature color="#3b82f6" size={24} />
                            </View>
                            <View style={styles.docInfo}>
                                <Text style={styles.docTitle}>개인정보 활용 동의서</Text>
                                <Text style={styles.docDate}>2023.10.20 마감</Text>
                            </View>
                            <TouchableOpacity style={styles.signButton}>
                                <Text style={styles.signButtonText}>서명하기</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
                {selectedTab === '계약' && (
                    <View style={styles.docCard}>
                        <View style={styles.docIcon}>
                            <FileText color="#10B981" size={24} />
                        </View>
                        <View style={styles.docInfo}>
                            <Text style={styles.docTitle}>강남본원 2023 하반기 계약서</Text>
                            <Text style={styles.docDate}>2023.09.01 체결 완료</Text>
                        </View>
                        <TouchableOpacity style={styles.viewButton}>
                            <Text style={styles.viewButtonText}>보기</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa', paddingTop: 50 },
    tabContainer: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    tabButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, backgroundColor: '#f0f0f0' },
    activeTabButton: { backgroundColor: '#3b82f6' },
    tabText: { fontSize: 13, color: '#666', fontWeight: '500' },
    activeTabText: { color: 'white', fontWeight: 'bold' },
    contentContainer: { padding: 15 },
    todoBadgeContainer: { alignSelf: 'flex-start', backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#FECACA' },
    todoBadgeText: { color: '#DC2626', fontWeight: 'bold', fontSize: 14 },
    docCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 10 },
    docIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    docInfo: { flex: 1 },
    docTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
    docDate: { fontSize: 12, color: '#666' },
    signButton: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    signButtonText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    viewButton: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    viewButtonText: { color: '#666', fontWeight: 'bold', fontSize: 13 },
});
