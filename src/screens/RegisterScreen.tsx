import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signup, refresh } from '../api/authApi';
import { getProfile } from '../api/usersApi';
import { checkBusinessSlugExists, createBusiness, getBusinessById } from '../api/businessApi';
import { useAuthStore } from '../store/authStore';
import { mapApiError } from '../utils/mapApiError';
import { ROUTES } from '../constants/navigation';
import { REGISTER_VALIDATION } from '../constants/registerConstants';
import { capitalizeNameInput, slugify, validateRegisterForm, type RegisterFormValues } from '../lib/registerValidation';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const setUser = useAuthStore((s) => s.setUser);
  const setBusiness = useAuthStore((s) => s.setBusiness);

  const [instituteName, setInstituteName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    if (!instituteName.trim()) return;
    setSlug(slugify(instituteName, true));
  }, [instituteName]);

  useEffect(() => {
    const s = slug.trim();
    if (!s || s.length < REGISTER_VALIDATION.SLUG_MIN) {
      setSlugStatus('idle');
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      setSlugStatus('checking');
      try {
        const exists = await checkBusinessSlugExists(s);
        if (cancelled) return;
        setSlugStatus(exists ? 'taken' : 'available');
      } catch {
        if (cancelled) return;
        setSlugStatus('error');
      }
    }, REGISTER_VALIDATION.SLUG_CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [slug]);

  const onSubmit = useCallback(async () => {
    if (isLoading) return;
    setInlineError(null);

    const trimmedInstitute = instituteName.trim();
    const trimmedSlug = slug.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMobile = mobile.trim();

    const form: RegisterFormValues = {
      instituteName,
      slug,
      name,
      email,
      password,
      confirmPassword,
      termsAccepted,
      mobile,
    };

    const validationError = validateRegisterForm(form);
    if (validationError) {
      setInlineError(validationError);
      return;
    }

    if (slugStatus === 'taken') {
      setInlineError('This URL slug is already taken. Choose another.');
      return;
    }
    if (slugStatus === 'checking') {
      setInlineError('Please wait for the slug check to finish.');
      return;
    }
    if (slugStatus === 'error') {
      setInlineError('Could not verify slug availability. Try again.');
      return;
    }

    setIsLoading(true);
    try {
      const slugTaken = await checkBusinessSlugExists(trimmedSlug);
      if (slugTaken) {
        setInlineError('This URL slug is already taken. Choose another.');
        return;
      }

      await signup({
        name: trimmedName,
        email: trimmedEmail,
        password,
        mobile: trimmedMobile ? trimmedMobile : undefined,
      });

      try {
        await createBusiness({
          instituteName: trimmedInstitute,
          slug: trimmedSlug,
        });
      } catch (bizErr) {
        setInlineError(mapApiError(bizErr).message || 'Business setup failed. Please contact support.');
        return;
      }

      try {
        await refresh();
      } catch {
        // Session may already be valid; profile fetch will surface auth issues.
      }

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
  }, [
    confirmPassword,
    email,
    instituteName,
    isLoading,
    mobile,
    name,
    password,
    slug,
    slugStatus,
    termsAccepted,
    setBusiness,
    setUser,
  ]);

  const slugHint = useMemo(() => {
    const s = slug.trim();
    if (!s || s.length < REGISTER_VALIDATION.SLUG_MIN) return null;
    if (slugStatus === 'checking') return 'Checking availability…';
    if (slugStatus === 'available') return 'This URL is available.';
    if (slugStatus === 'taken') return 'This URL is already taken.';
    if (slugStatus === 'error') return 'Could not check availability. Try again.';
    return null;
  }, [slug, slugStatus]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Set up your institute and admin profile</Text>

          <Text style={styles.label}>Institute name</Text>
          <TextInput
            value={instituteName}
            onChangeText={setInstituteName}
            placeholder="Your coaching / institute name"
            placeholderTextColor="#64748b"
            style={styles.input}
            editable={!isLoading}
          />

          <Text style={styles.label}>URL slug</Text>
          <Text style={styles.hint}>Lowercase letters, numbers, and hyphens only. Used in your institute link.</Text>
          <TextInput
            value={slug}
            onChangeText={(t) => setSlug(slugify(t))}
            onBlur={() => setSlug((s) => slugify(s, true))}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="your-institute"
            placeholderTextColor="#64748b"
            style={styles.input}
            editable={!isLoading}
          />
          {slugHint ? (
            <Text
              style={[
                styles.slugHint,
                slugStatus === 'taken' && styles.slugHintBad,
                slugStatus === 'available' && styles.slugHintOk,
              ]}
            >
              {slugHint}
            </Text>
          ) : null}

          <Text style={styles.label}>Your name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={() => setName((n) => capitalizeNameInput(n))}
            placeholder="Full name"
            placeholderTextColor="#64748b"
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
            placeholderTextColor="#64748b"
            style={styles.input}
            editable={!isLoading}
          />

          <Text style={styles.label}>Mobile (optional)</Text>
          <TextInput
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            placeholder="9876543210"
            placeholderTextColor="#64748b"
            style={styles.input}
            editable={!isLoading}
          />

          <Text style={styles.label}>Password</Text>
          <Text style={styles.hint}>
            {REGISTER_VALIDATION.PASSWORD_MIN}–{REGISTER_VALIDATION.PASSWORD_MAX} characters, with upper, lower, number,
            and {REGISTER_VALIDATION.PASSWORD_SPECIAL_CHARSET}.
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor="#64748b"
            style={styles.input}
            editable={!isLoading}
          />

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Confirm password"
            placeholderTextColor="#64748b"
            style={styles.input}
            editable={!isLoading}
          />

          <Pressable
            style={styles.termsRow}
            onPress={() => {
              if (!isLoading) setTermsAccepted(!termsAccepted);
            }}
          >
            <Switch
              value={termsAccepted}
              onValueChange={setTermsAccepted}
              disabled={isLoading}
              trackColor={{ false: '#334155', true: '#2563eb' }}
            />
            <Text style={styles.termsText}>I accept the terms and conditions</Text>
          </Pressable>

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingVertical: 24,
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
  hint: {
    color: '#8896b3',
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 16,
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
  slugHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#8896b3',
  },
  slugHintOk: {
    color: '#86efac',
  },
  slugHintBad: {
    color: '#fca5a5',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  termsText: {
    flex: 1,
    color: '#b7c3dd',
    fontSize: 14,
    lineHeight: 20,
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
