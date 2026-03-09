import React from 'react';
import { StyleSheet, TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { Colors, Radius } from '@/constants/theme';
import { Typography } from './Typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    title: string;
    loading?: boolean;
}

export function Button({
    style,
    variant = 'primary',
    size = 'md',
    title,
    loading = false,
    disabled,
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading;

    const getBackgroundColor = () => {
        if (variant === 'primary') return Colors.brandHoney;
        if (variant === 'secondary') return '#FFF0C2'; // Light honey
        if (variant === 'danger') return '#FCE9E7';
        if (variant === 'outline' || variant === 'ghost') return 'transparent';
        return Colors.brandHoney;
    };

    const getTextColor = () => {
        if (variant === 'primary' || variant === 'secondary') return Colors.brandInk;
        if (variant === 'danger') return Colors.colorError;
        if (variant === 'outline') return Colors.brandInk;
        if (variant === 'ghost') return Colors.mutedForeground;
        return Colors.brandInk;
    };

    const getBorderColor = () => {
        if (variant === 'outline') return Colors.brandSand;
        return 'transparent';
    };

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            disabled={isDisabled}
            style={[
                styles.container,
                Radius.button,
                styles[size],
                {
                    backgroundColor: isDisabled && variant !== 'ghost' && variant !== 'outline' ? '#E5E7EB' : getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'outline' ? 1 : 0,
                },
                // To enforce asymmetric radius in older Androids
                { overflow: 'hidden' },
                style,
            ]}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Typography
                    variant="subtitle2"
                    weight="600"
                    color={isDisabled ? '#9CA3AF' : getTextColor()}
                    align="center"
                >
                    {title}
                </Typography>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    sm: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        minHeight: 36,
    },
    md: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        minHeight: 48,
    },
    lg: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        minHeight: 56,
    },
});
