import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { Colors, Radius } from '@/constants/theme';
import { Typography } from '../atoms/Typography';
import { Eraser } from 'lucide-react-native';

interface SignaturePadProps {
    onOK?: (signature: string) => void;
    onEmpty?: () => void;
    descriptionText?: string;
    clearText?: string;
    confirmText?: string;
}

export function SignaturePad({
    onOK,
    onEmpty,
    descriptionText = '아래 영역에 서명해 주세요',
    clearText = '초기화',
    confirmText = '서명 완료',
}: SignaturePadProps) {
    const ref = useRef<SignatureViewRef>(null);
    const [isSigned, setIsSigned] = useState(false);

    const handleSignature = (signature: string) => {
        setIsSigned(true);
        if (onOK) {
            onOK(signature);
        }
    };

    const handleEmpty = () => {
        setIsSigned(false);
        if (onEmpty) {
            onEmpty();
        }
    };

    const handleClear = () => {
        ref.current?.clearSignature();
        setIsSigned(false);
    };

    const handleConfirm = () => {
        ref.current?.readSignature();
    };

    // Style the canvas container and hide default buttons
    const webStyle = `
        .m-signature-pad {
            box-shadow: none;
            border: none;
            margin: 0;
            padding: 0;
        }
        .m-signature-pad--body {
            border: none;
            bottom: 0px;
        }
        .m-signature-pad--footer {
            display: none;
            margin: 0px;
        }
    `;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Typography variant="body2" color={Colors.mutedForeground}>
                    {descriptionText}
                </Typography>

                <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={handleClear}
                    activeOpacity={0.7}
                >
                    <Eraser color={Colors.mutedForeground} size={14} />
                    <Typography variant="caption" color={Colors.mutedForeground} style={{ marginLeft: 4 }}>
                        {clearText}
                    </Typography>
                </TouchableOpacity>
            </View>

            <View style={styles.padWrapper}>
                <SignatureScreen
                    ref={ref}
                    onOK={handleSignature}
                    onEmpty={handleEmpty}
                    webStyle={webStyle}
                    autoClear={false}
                    descriptionText={descriptionText}
                    clearText={clearText}
                    confirmText={confirmText}
                    backgroundColor="#FFFFFF"
                    penColor="#000000"
                />
            </View>

            <TouchableOpacity
                style={[styles.confirmBtn, !isSigned ? styles.confirmBtnDisabled : null]}
                onPress={handleConfirm}
                activeOpacity={0.8}
            >
                <Typography variant="body1" color="white" weight="700">
                    {confirmText}
                </Typography>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: Colors.surfaceSoft,
        borderRadius: 12,
    },
    padWrapper: {
        height: 200,
        backgroundColor: 'white',
        borderRadius: Radius.card,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        marginBottom: 16,
    },
    confirmBtn: {
        backgroundColor: Colors.brandInk,
        height: 52,
        ...Radius.button,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmBtnDisabled: {
        backgroundColor: Colors.mutedForeground,
        opacity: 0.8,
    }
});
