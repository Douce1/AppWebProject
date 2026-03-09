import React from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { Colors } from '@/constants/theme';
import { Typography } from './Typography';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
    source?: ImageSourcePropType;
    fallbackText?: string;
    size?: AvatarSize;
}

export function Avatar({ source, fallbackText, size = 'md' }: AvatarProps) {
    const getDimensions = () => {
        switch (size) {
            case 'sm': return { width: 32, height: 32, borderRadius: 16 };
            case 'md': return { width: 48, height: 48, borderRadius: 24 };
            case 'lg': return { width: 64, height: 64, borderRadius: 32 };
            case 'xl': return { width: 96, height: 96, borderRadius: 48 };
        }
    };

    const dimensions = getDimensions();

    if (source) {
        return <Image source={source} style={[styles.container, dimensions]} />;
    }

    return (
        <View style={[styles.container, styles.fallback, dimensions]}>
            <Typography
                variant={size === 'sm' ? 'caption' : size === 'xl' ? 'h2' : 'subtitle2'}
                color={Colors.brandInk}
                weight="600"
            >
                {fallbackText ? fallbackText.charAt(0).toUpperCase() : '?'}
            </Typography>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.brandSand,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    fallback: {
        backgroundColor: Colors.brandCream,
        borderWidth: 1,
        borderColor: Colors.brandSand,
    }
});
