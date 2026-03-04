import ClassDetailScreen from '@/src/screens/ClassDetailScreen';
import { Stack } from 'expo-router';

export default function ClassDetail() {
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <ClassDetailScreen />
        </>
    );
}
