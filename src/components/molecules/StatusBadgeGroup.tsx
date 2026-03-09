import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Typography } from '../atoms/Typography';
import { Badge } from '../atoms/Badge';
import { Colors } from '@/constants/theme';

interface StatusBadgeGroupProps {
    label: string;
    status: string; // e.g., 'confirmed', 'pending', mapped in BadgeColors
    badgeLabel: string;
    style?: ViewStyle;
}

export function StatusBadgeGroup({ label, status, badgeLabel, style }: StatusBadgeGroupProps) {
    return (
        <View style={[styles.container, style]}>
            <Typography variant="body2" color={Colors.mutedForeground} style={styles.label}>
                {label}
            </Typography>
            <Badge status={status} label={badgeLabel} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    label: {
        marginRight: 4,
    }
});
