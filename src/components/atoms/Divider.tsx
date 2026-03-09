import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

interface DividerProps {
    style?: ViewStyle;
    color?: string;
    thickness?: number;
    marginVertical?: number;
}

export function Divider({
    style,
    color = Colors.brandSand,
    thickness = 1,
    marginVertical = 0,
}: DividerProps) {
    return (
        <View
            style={[
                styles.divider,
                {
                    backgroundColor: color,
                    height: thickness,
                    marginVertical,
                },
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    divider: {
        width: '100%',
    },
});
