import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../../lib/api';
import { theme } from '../../lib/theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ServerLogin'>;

const STAFF_KEY = 'tableflow_staff';

export async function getStaffCredentials() {
  const raw = await SecureStore.getItemAsync(STAFF_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveStaffCredentials(data: {
  access_token: string;
  staff_id: string;
  venue_id: string;
  display_name: string;
}) {
  await SecureStore.setItemAsync(STAFF_KEY, JSON.stringify(data));
}

export function ServerLoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/auth/staff-login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await saveStaffCredentials({
        access_token: data.access_token,
        staff_id: data.staff_id,
        venue_id: data.venue_id,
        display_name: data.display_name,
      });
      navigation.replace('ServerFloor');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Server Sign In</Text>
      <Text style={styles.subtitle}>Sign in with your staff account</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={theme.colors.gold} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>← Back to guest mode</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontFamily: theme.fonts.serif, marginBottom: 8, color: theme.colors.onSurface },
  subtitle: { color: theme.colors.onSurfaceVariant, marginBottom: 24, fontFamily: theme.fonts.sans },
  input: {
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.radii.md,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
    color: theme.colors.onSurface,
    fontFamily: theme.fonts.sans,
  },
  button: { backgroundColor: theme.colors.gold, padding: 16, borderRadius: theme.radii.full, alignItems: 'center', marginTop: 8 },
  buttonText: { color: theme.colors.goldOn, fontFamily: theme.fonts.sansBold, letterSpacing: 0.5 },
  error: { color: theme.colors.error, marginBottom: 12, fontFamily: theme.fonts.sans },
  link: { color: theme.colors.gold, textAlign: 'center', marginTop: 24, fontFamily: theme.fonts.sansBold },
});
