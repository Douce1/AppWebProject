import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

interface TypographyProps extends TextProps {
    variant?: 'h1' | 'h2' | 'h3' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'caption';
    color?: string;
    weight?: 'normal' | '500' | '600' | '700' | 'bold';
    align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function Typography({
    style,
    variant = 'body1',
    color = Colors.foreground,
    weight,
    align,
    ...props
}: TypographyProps) {
    return (
        <Text
            style={[
                styles[variant],
                { color, textAlign: align },
                weight && { fontWeight: weight },
                style,
            ]}
            {...props}
        />
    );
}

const styles = StyleSheet.create({
    h1: {
        fontFamily: Fonts.default.sans,
        fontSize: 32,
        fontWeight: '700',
    },
    h2: {
        fontFamily: Fonts.default.sans,
        fontSize: 24,
        fontWeight: '700',
    },
    h3: {
        fontFamily: Fonts.default.sans,
        fontSize: 20,
        fontWeight: '700',
    },
    subtitle1: {
        fontFamily: Fonts.default.sans,
        fontSize: 18,
        fontWeight: '600',
    },
    subtitle2: {
        fontFamily: Fonts.default.sans,
        fontSize: 16,
        fontWeight: '600',
    },
    body1: {
        fontFamily: Fonts.default.sans,
        fontSize: 15,
        fontWeight: 'normal',
    },
    body2: {
        fontFamily: Fonts.default.sans,
        fontSize: 14,
        fontWeight: 'normal',
    },
    caption: {
        fontFamily: Fonts.default.sans,
        fontSize: 12,
        fontWeight: 'normal',
    },
});
