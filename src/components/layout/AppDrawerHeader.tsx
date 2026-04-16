import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Business } from '../../api/apiTypes';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../constants/navigation';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

function initialsFromInstitute(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0) ?? ''}${parts[1]!.charAt(0) ?? ''}`.toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Left side of the main drawer header: institution logo (or initials) + name.
 */
function businessDisplayName(business: Business | null | undefined): string {
  if (!business) return 'ContentKosh';
  const raw = business as Business & { institute_name?: string };
  const fromApi =
    raw.instituteName?.trim() ||
    raw.institute_name?.trim() ||
    raw.name?.trim();
  return fromApi || 'ContentKosh';
}

export function AppDrawerHeaderBrand() {
  const business = useAuthStore((s) => s.business);
  const displayName = businessDisplayName(business);
  const logoUri = resolveMediaUrl(business?.logo ?? undefined);

  return (
    <View style={styles.brandRow}>
      {logoUri ? (
        <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
      ) : (
        <View style={styles.logoFallback}>
          <Text style={styles.logoFallbackText}>{initialsFromInstitute(displayName)}</Text>
        </View>
      )}
      <View style={styles.nameWrap}>
        <Text style={styles.brandName} numberOfLines={2} ellipsizeMode="tail">
          {displayName}
        </Text>
      </View>
    </View>
  );
}

/**
 * Bell opens the Announcements tab (closest match to notifications in this app).
 */
export function AppDrawerHeaderBell() {
  const navigation = useNavigation();

  const onPress = () => {
    // @ts-expect-error nested tab inside drawer
    navigation.navigate(ROUTES.APP.DRAWER_TABS, { screen: ROUTES.TABS.ANNOUNCEMENTS });
  };

  return (
    <Pressable
      onPress={onPress}
      style={styles.bellWrap}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Open announcements"
    >
      <Text style={styles.bellGlyph}>🔔</Text>
    </Pressable>
  );
}

const LOGO_SIZE = 36;

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: LOGO_SIZE,
    minWidth: 0,
    gap: 10,
  },
  nameWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 10,
    backgroundColor: '#111a2e',
    flexShrink: 0,
  },
  logoFallback: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 10,
    backgroundColor: '#0e7490',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#155e75',
    flexShrink: 0,
  },
  logoFallbackText: {
    color: '#ecfeff',
    fontSize: 14,
    fontWeight: '800',
  },
  brandName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  bellWrap: {
    marginRight: 4,
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#111a2e',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  bellGlyph: {
    fontSize: 20,
    lineHeight: 22,
  },
});
