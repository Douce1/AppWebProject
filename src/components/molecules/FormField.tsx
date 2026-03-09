import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Typography } from '../atoms/Typography';
import { Colors, Radius } from '@/constants/theme';
import { Eye, EyeOff } from 'lucide-react-native';

interface FormFieldProps extends Omit<TextInputProps, 'style'> {
    label?: string;
    error?: string;
    helperText?: string;
    isPassword?: boolean;
    style?: any;
}

export function FormField({
    label,
    error,
    helperText,
    isPassword,
    style,
    ...props
}: FormFieldProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <View style={styles.container}>
            {label && (
                <Typography variant="body2" color={Colors.foreground} weight="600" style={styles.label}>
                    {label}
                </Typography>
            )}

            <View style={[
                styles.inputContainer,
                isFocused && styles.inputFocused,
                error && styles.inputError,
                style
            ]}>
                <TextInput
                    style={styles.input}
                    placeholderTextColor={Colors.mutedForeground}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    secureTextEntry={isPassword && !showPassword}
                    {...props}
                />

                {isPassword && (
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                        activeOpacity={0.7}
                    >
                        {showPassword ? (
                            <EyeOff color={Colors.mutedForeground} size={20} />
                        ) : (
                            <Eye color={Colors.mutedForeground} size={20} />
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {error ? (
                <Typography variant="caption" color={Colors.colorError} style={styles.helperText}>
                    {error}
                </Typography>
            ) : helperText ? (
                <Typography variant="caption" color={Colors.mutedForeground} style={styles.helperText}>
                    {helperText}
                </Typography>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Radius.button,
        minHeight: 48,
        paddingHorizontal: 12,
    },
    inputFocused: {
        borderColor: Colors.brandHoney,
        backgroundColor: Colors.surfaceSoft,
    },
    inputError: {
        borderColor: Colors.colorError,
    },
    input: {
        flex: 1,
        fontFamily: 'Pretendard-Regular',
        fontSize: 15,
        color: Colors.foreground,
        paddingVertical: 12,
    },
    eyeButton: {
        padding: 4,
        marginLeft: 8,
    },
    helperText: {
        marginTop: 6,
        marginLeft: 4,
    }
});
