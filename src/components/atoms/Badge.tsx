import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius } from '@/constants/theme';
import { Typography } from './Typography';
import { BadgeColors } from '@/constants/badge-status';

interface BadgeProps {
    status: string; // e.g., 'confirmed', 'pending', etc., mapped in BadgeColors
    label: string;
    style?: ViewStyle;
}

export function Badge({ status, label, style }: BadgeProps) {
    const colorSet = BadgeColors[status] || { bg: '#F5EFE2', text: '#7A6A58', dot: '#7A6A58' };

    return (
        <View
            style={[
                styles.container,
                Radius.button, // Same asymmetric radius as buttons
                { backgroundColor: colorSet.bg },
                style,
            ]}
        >
            <View style={[styles.dot, { backgroundColor: colorSet.dot }]} />
            <Typography variant="caption" weight="600" color={colorSet.text}>
                {label}
            </Typography>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        alignSelf: 'flex-start',
        overflow: 'hidden',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
});
