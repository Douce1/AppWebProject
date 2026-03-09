import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '../atoms/Typography';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { Colors } from '@/constants/theme';
import { ClassStatus } from '@/constants/badge-status';

interface ProfileHeroProps {
    name: string;
    role: string;
    imageUrl?: string;
    hint?: string;
}

export function ProfileHero({ name, role, imageUrl, hint }: ProfileHeroProps) {
    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Avatar source={imageUrl ? { uri: imageUrl } : undefined} fallbackText={name} size="lg" />
                <View style={styles.textContainer}>
                    <View style={styles.nameRow}>
                        <Typography variant="h2" style={styles.name}>{name}</Typography>
                        <Badge status={ClassStatus.Confirmed} label={role} />
                    </View>
                    {hint && (
                        <Typography variant="body2" color={Colors.brandInk} style={styles.hint}>
                            {hint}
                        </Typography>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: Colors.brandHoney,
        borderTopLeftRadius: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderTopRightRadius: 0,
        marginHorizontal: 16,
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    textContainer: {
        flex: 1, // Ensure the container can shrink
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
        flexWrap: 'wrap', // Allow wrapping for long names and badges
    },
    name: {
        color: Colors.brandInk,
        flexShrink: 1, // Allow text to shrink to fit
    },
    hint: {
        opacity: 0.8,
    }
});
