import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Avatar } from '../atoms/Avatar';
import { Typography } from '../atoms/Typography';
import { Colors } from '@/constants/theme';
import { ChevronRight } from 'lucide-react-native';

interface InstructorChipProps {
    name: string;
    role: string;
    imageUrl?: string;
    onPress?: () => void;
    style?: ViewStyle;
    showChevron?: boolean;
}

export function InstructorChip({ name, role, imageUrl, onPress, style, showChevron = true }: InstructorChipProps) {
    const content = (
        <View style={[styles.container, style]}>
            <Avatar source={imageUrl ? { uri: imageUrl } : undefined} fallbackText={name} size="sm" />
            <View style={styles.textContainer}>
                <Typography variant="subtitle2" weight="600">{name}</Typography>
                <Typography variant="caption" color={Colors.mutedForeground}>{role}</Typography>
            </View>
            {showChevron && <ChevronRight size={20} color={Colors.mutedForeground} />}
        </View>
    );

    if (onPress) {
        return <TouchableOpacity activeOpacity={0.7} onPress={onPress}>{content}</TouchableOpacity>;
    }

    return content;
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: Colors.surfaceSoft,
        borderRadius: 16,
        gap: 12,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    }
});
