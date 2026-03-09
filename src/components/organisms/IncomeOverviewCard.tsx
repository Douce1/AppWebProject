import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '../atoms/Typography';
import { Colors, Radius, Shadows } from '@/constants/theme';

interface IncomeOverviewCardProps {
    title: string;
    amount: string;
    subtitle: string;
    dateStr: string;
}

export function IncomeOverviewCard({ title, amount, subtitle, dateStr }: IncomeOverviewCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Typography variant="subtitle2" color={Colors.brandSand}>{title}</Typography>
                <Typography variant="caption" color={Colors.brandSand}>{dateStr}</Typography>
            </View>
            <Typography variant="h1" color={Colors.brandCream} style={styles.amount}>{amount}원</Typography>
            <Typography variant="body2" color={Colors.brandSand}>{subtitle}</Typography>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.brandInk,
        borderRadius: Radius.card,
        padding: 24,
        ...Shadows.card,
        marginHorizontal: 16,
        marginVertical: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    amount: {
        marginBottom: 8,
    }
});
