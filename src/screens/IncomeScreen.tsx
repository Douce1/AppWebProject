import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { TrendingUp, RefreshCcw } from 'lucide-react-native';

export default function IncomeScreen() {
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>수입/정산</Text>
            </View>

            <View style={styles.incomeCard}>
                <Text style={styles.incomeLabel}>이번 달 수입</Text>
                <View style={styles.amountRow}>
                    <Text style={styles.amountText}>3,450,000</Text>
                    <Text style={styles.currencyText}>원</Text>
                </View>

                <View style={styles.increaseBadge}>
                    <TrendingUp color="#10B981" size={14} style={{ marginRight: 4 }} />
                    <Text style={styles.increaseText}>지난달 대비 12% 상승</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.paymentRow}>
                    <RefreshCcw color="#6B7280" size={14} style={{ marginRight: 6 }} />
                    <Text style={styles.paymentText}>지급 예정일: 11월 10일</Text>
                </View>
            </View>

            <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>정산 내역</Text>

                {/* Mock History Items */}
                <View style={styles.historyItem}>
                    <View>
                        <Text style={styles.historyTitle}>9월 정산금</Text>
                        <Text style={styles.historyDate}>10.10 지급완료</Text>
                    </View>
                    <Text style={styles.historyAmount}>+3,080,000원</Text>
                </View>
                <View style={styles.historyItem}>
                    <View>
                        <Text style={styles.historyTitle}>8월 정산금</Text>
                        <Text style={styles.historyDate}>09.10 지급완료</Text>
                    </View>
                    <Text style={styles.historyAmount}>+3,150,000원</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: 'white' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    incomeCard: { backgroundColor: '#1E3A8A', margin: 15, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    incomeLabel: { color: '#BFDBFE', fontSize: 14, marginBottom: 8 },
    amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
    amountText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    currencyText: { color: 'white', fontSize: 18, marginLeft: 4, fontWeight: '600' },
    increaseBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    increaseText: { color: '#10B981', fontSize: 13, fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 15 },
    paymentRow: { flexDirection: 'row', alignItems: 'center' },
    paymentText: { color: '#E5E7EB', fontSize: 14 },
    historySection: { paddingHorizontal: 20, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    historyItem: { backgroundColor: 'white', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    historyTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
    historyDate: { fontSize: 12, color: '#6B7280' },
    historyAmount: { fontSize: 16, fontWeight: 'bold', color: '#10B981' }
});
