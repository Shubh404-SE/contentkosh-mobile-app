import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signup } from '../api/authApi';
import { getProfile } from '../api/usersApi';
import { getBusinessById } from '../api/businessApi';
import { useAuthStore } from '../store/authStore';
import { mapApiError } from '../utils/mapApiError';
import { ROUTES } from '../constants/navigation';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const setUser = useAuthStore((s) => s.setUser);
  const setBusiness = useAuthStore((s) => s.setBusiness);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const onSubmit = useCallback(async () => {
    if (isLoading) return;
    setInlineError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMobile = mobile.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setInlineError('Name, email, and password are required.');
      return;
    }

    if (password.length < 6) {
      setInlineError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setInlineError("Passwords don't match.");
      return;
    }

    setIsLoading(true);
    try {
      await signup({
        name: trimmedName,
        email: trimmedEmail,
        password,
        mobile: trimmedMobile ? trimmedMobile : undefined,
      });

      // Server sets cookies; follow the same session bootstrap as login.
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
      setInlineError(mapApiError(e).message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  }, [confirmPassword, email, isLoading, mobile, name, password, setBusiness, setUser]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Sign up to continue</Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          style={styles.input}
          editable={!isLoading}
        />

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

        <Text style={styles.label}>Mobile (optional)</Text>
        <TextInput
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
          placeholder="9876543210"
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

        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Confirm password"
          style={styles.input}
          editable={!isLoading}
        />

        {inlineError ? <Text style={styles.errorText}>{inlineError}</Text> : null}

        <TouchableOpacity
          onPress={onSubmit}
          style={[styles.button, isLoading ? styles.buttonDisabled : null]}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create account</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.AUTH.LOGIN)}
          style={[styles.linkButton, isLoading ? styles.buttonDisabled : null]}
          disabled={isLoading}
        >
          <Text style={styles.linkText}>Back to login</Text>
        </TouchableOpacity>
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
});

