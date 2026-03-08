import { View, Text, StyleSheet } from 'react-native';

export default function LoginRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>로그인이 필요합니다.</Text>
      <Text style={styles.description}>
        인증이 만료되었습니다. 다시 로그인해주세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#4b5563',
  },
});
