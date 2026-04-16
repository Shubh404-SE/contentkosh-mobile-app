import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { login as loginRequest } from '../api/authApi';
import { getProfile } from '../api/usersApi';
import { getBusinessById } from '../api/businessApi';
import { useAuthStore } from '../store/authStore';
import { mapApiError } from '../utils/mapApiError';
import { API_BASE_URL } from '../constants/config';
import { ROUTES } from '../constants/navigation';
import type { AuthStackParamList } from '../navigation/AuthNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const setUser = useAuthStore((s) => s.setUser);
  const setBusiness = useAuthStore((s) => s.setBusiness);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const onSubmit = useCallback(async () => {
    if (isLoading) return;
    setInlineError(null);

    if (!email.trim() || !password) {
      setInlineError('Email and password are required.');
      return;
    }

    setIsLoading(true);
    try {
      await loginRequest({ email: email.trim(), password });

      const profile = await getProfile();
      setUser(profile);

      const businessId = profile.businessId ?? null;
      if (typeof businessId === 'number') {
        const business = await getBusinessById(businessId);
        setBusiness(business);
      } else {
        setBusiness(null);
      }
    } catch (e) {
      const appError = mapApiError(e);
      const message =
        appError.statusCode === 401
          ? 'Invalid email or password.'
          : appError.message || 'Login failed.';
      setInlineError(message);
      if (__DEV__) {
        Alert.alert('Login failed (dev)', `${message}\n\nAPI: ${API_BASE_URL}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, isLoading, password, setBusiness, setUser]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>ContentKosh</Text>
        <Text style={styles.subtitle}>Sign in</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          style={styles.input}
          editable={!isLoading}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          style={styles.input}
          editable={!isLoading}
        />

        {inlineError ? <Text style={styles.errorText}>{inlineError}</Text> : null}

        <TouchableOpacity
          onPress={onSubmit}
          style={[styles.button, isLoading ? styles.buttonDisabled : null]}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.AUTH.REGISTER)}
          style={[styles.linkButton, isLoading ? styles.buttonDisabled : null]}
          disabled={isLoading}
        >
          <Text style={styles.linkText}>Create an account</Text>
        </TouchableOpacity>

        <Text style={styles.footerHint}>API: {API_BASE_URL}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#0b1220',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#111a2e',
    borderWidth: 1,
    borderColor: '#1f2a44',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#b7c3dd',
    marginTop: 4,
    marginBottom: 16,
  },
  label: {
    color: '#b7c3dd',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#0b1220',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2a44',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#ffffff',
  },
  errorText: {
    color: '#ff8a8a',
    marginTop: 12,
  },
  button: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  linkButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  linkText: {
    color: '#93c5fd',
    fontWeight: '700',
  },
  footerHint: {
    marginTop: 12,
    color: '#6b7aa3',
    fontSize: 12,
  },
});

