import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from '../atoms/Typography';
import { Button } from '../atoms/Button';
import { InstructorChip } from '../molecules/InstructorChip';
import { StatusBadgeGroup } from '../molecules/StatusBadgeGroup';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { MapPin, Clock } from 'lucide-react-native';

interface LessonCardProps {
    status: string; // e.g., 'confirmed', 'requested'
    badgeLabel: string;
    statusLabel: string;
    title: string;
    location: string;
    time: string;
    instructorName?: string;
    instructorRole?: string;
    instructorImageUrl?: string;
    onPressCard?: () => void;
    primaryActionLabel?: string;
    onPrimaryAction?: () => void;
    primaryActionDisabled?: boolean;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
}

export function LessonCard({
    status,
    badgeLabel,
    statusLabel,
    title,
    location,
    time,
    instructorName,
    instructorRole,
    instructorImageUrl,
    onPressCard,
    primaryActionLabel,
    onPrimaryAction,
    primaryActionDisabled,
    secondaryActionLabel,
    onSecondaryAction,
}: LessonCardProps) {
    return (
        <TouchableOpacity
            activeOpacity={onPressCard ? 0.7 : 1}
            onPress={onPressCard}
            style={styles.card}
        >
            <StatusBadgeGroup status={status} label={statusLabel} badgeLabel={badgeLabel} style={styles.badgeGroup} />

            <Typography variant="h3" style={styles.title}>{title}</Typography>

            <View style={styles.infoRow}>
                <MapPin size={16} color={Colors.mutedForeground} />
                <Typography variant="body2" color={Colors.mutedForeground} style={styles.infoText}>{location}</Typography>
            </View>

            <View style={styles.infoRow}>
                <Clock size={16} color={Colors.mutedForeground} />
                <Typography variant="body2" color={Colors.mutedForeground} style={styles.infoText}>{time}</Typography>
            </View>

            {instructorName && instructorRole && (
                <InstructorChip
                    name={instructorName}
                    role={instructorRole}
                    imageUrl={instructorImageUrl}
                    showChevron={false}
                    style={styles.instructor}
                />
            )}

            {(primaryActionLabel || secondaryActionLabel) && (
                <View style={styles.actionRow}>
                    {secondaryActionLabel && onSecondaryAction && (
                        <Button
                            variant="secondary"
                            title={secondaryActionLabel}
                            onPress={onSecondaryAction}
                            style={styles.actionButton}
                        />
                    )}
                    {primaryActionLabel && onPrimaryAction && (
                        <Button
                            variant={primaryActionDisabled ? "ghost" : "primary"}
                            disabled={primaryActionDisabled}
                            title={primaryActionLabel}
                            onPress={onPrimaryAction}
                            style={styles.actionButton}
                        />
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card,
        borderRadius: Radius.card,
        padding: 20,
        marginBottom: 16,
        ...Shadows.card,
    },
    badgeGroup: {
        marginBottom: 12,
    },
    title: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoText: {
        marginLeft: 6,
    },
    instructor: {
        marginTop: 8,
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
    }
});
