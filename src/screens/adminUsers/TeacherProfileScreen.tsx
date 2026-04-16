import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTeacherProfile, getTeacherByUserId, updateTeacherProfile } from '../../api/teachersApi';
import type { User } from '../../api/apiTypes';
import { ADMIN_USERS_QUERY_KEYS } from '../../constants/adminUsersQueryKeys';
import { BATCH_UI } from '../../constants/batchUi';
import { useAuthStore } from '../../store/authStore';
import { mapApiError } from '../../utils/mapApiError';
import { showToast } from '../../utils/toast';
import type { AdminUsersStackParamList } from './AdminUsersStack';

type TeacherRoute = RouteProp<AdminUsersStackParamList, 'TeacherProfile'>;

function displayName(user: Pick<User, 'name' | 'email'>): string {
  const name = (user.name ?? '').trim();
  if (name) return name;
  return user.email;
}

function formatDate(value?: string | Date): string | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function TeacherProfileScreen() {
  const route = useRoute<TeacherRoute>();
  const { userId, user: routeUser } = route.params;

  const businessId = useAuthStore((s) => s.business?.id ?? null);
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [designation, setDesignation] = useState('');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [languages, setLanguages] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [address, setAddress] = useState('');
  const [isDobPickerOpen, setIsDobPickerOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editDesignation, setEditDesignation] = useState('');
  const [editQualification, setEditQualification] = useState('');
  const [editExperienceYears, setEditExperienceYears] = useState('0');
  const [editLanguages, setEditLanguages] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [editDobDate, setEditDobDate] = useState<Date | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [isEditDobPickerOpen, setIsEditDobPickerOpen] = useState(false);

  const resetCreateForm = () => {
    setDesignation('');
    setQualification('');
    setExperienceYears('0');
    setLanguages('');
    setBio('');
    setGender('');
    setDobDate(null);
    setIsDobPickerOpen(false);
    setAddress('');
  };

  const resetEditForm = () => {
    setEditDesignation('');
    setEditQualification('');
    setEditExperienceYears('0');
    setEditLanguages('');
    setEditBio('');
    setEditGender('');
    setEditDobDate(null);
    setIsEditDobPickerOpen(false);
    setEditAddress('');
  };

  const query = useQuery({
    queryKey: ADMIN_USERS_QUERY_KEYS.teacherProfileByUser(userId),
    queryFn: () => getTeacherByUserId(userId),
  });

  const teacher = query.data ?? null;
  const error = query.error ? mapApiError(query.error) : null;
  const isTeacherNotFound = error?.statusCode === 404;

  const user = teacher?.user ?? routeUser ?? null;

  const loading = query.isLoading || query.isFetching;
  const createMutation = useMutation({
    mutationFn: async () => {
      if (typeof businessId !== 'number') throw new Error('Missing business');
      const exp = Number(experienceYears);
      if (!designation.trim() || !qualification.trim() || !Number.isFinite(exp) || exp < 0) {
        throw new Error('Please fill designation, qualification and a valid experience.');
      }
      const langs = languages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const personal =
        gender || dobDate || address.trim()
          ? {
              ...(gender ? { gender } : {}),
              ...(dobDate ? { dob: dobDate.toISOString().slice(0, 10) } : {}),
              ...(address.trim() ? { address: address.trim() } : {}),
            }
          : undefined;

      await createTeacherProfile({
        businessId,
        userId,
        professional: {
          designation: designation.trim(),
          qualification: qualification.trim(),
          experienceYears: Math.floor(exp),
          bio: bio.trim() || undefined,
          languages: langs.length ? langs : undefined,
        },
        personal,
      });
    },
    onSuccess: async () => {
      setCreateOpen(false);
      resetCreateForm();
      showToast('Teacher profile created', 'success');
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEYS.teacherProfileByUser(userId) });
    },
    onError: (e) => {
      showToast(mapApiError(e).message || 'Failed to create teacher profile', 'error');
    },
  });

  const openEdit = () => {
    if (!teacher) return;
    setEditDesignation(teacher.designation ?? '');
    setEditQualification(teacher.qualification ?? '');
    setEditExperienceYears(String(teacher.experienceYears ?? 0));
    setEditLanguages(teacher.languages?.join(', ') ?? '');
    setEditBio(teacher.bio ?? '');

    const g = String(teacher.gender ?? '').toLowerCase();
    const mapped = g === 'male' || g === 'female' || g === 'other' ? (g as 'male' | 'female' | 'other') : '';
    setEditGender(mapped);

    setEditDobDate(teacher.dob ? new Date(teacher.dob) : null);
    setEditAddress(teacher.address ?? '');
    setIsEditDobPickerOpen(false);
    setEditOpen(true);
  };

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!teacher) throw new Error('Missing teacher');
      const exp = Number(editExperienceYears);
      if (!editDesignation.trim() || !editQualification.trim() || !Number.isFinite(exp) || exp < 0) {
        throw new Error('Please fill designation, qualification and a valid experience.');
      }

      const langs = editLanguages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const personal =
        editGender || editDobDate || editAddress.trim()
          ? {
              ...(editGender ? { gender: editGender } : {}),
              ...(editDobDate ? { dob: editDobDate.toISOString().slice(0, 10) } : {}),
              ...(editAddress.trim() ? { address: editAddress.trim() } : {}),
            }
          : undefined;

      await updateTeacherProfile({
        teacherId: teacher.id,
        professional: {
          designation: editDesignation.trim(),
          qualification: editQualification.trim(),
          experienceYears: Math.floor(exp),
          bio: editBio.trim() || undefined,
          languages: langs.length ? langs : undefined,
        },
        personal,
      });
    },
    onSuccess: async () => {
      setEditOpen(false);
      resetEditForm();
      showToast('Teacher profile updated', 'success');
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEYS.teacherProfileByUser(userId) });
    },
    onError: (e) => {
      showToast(mapApiError(e).message || 'Failed to update teacher profile', 'error');
    },
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Modal visible={createOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create teacher profile</Text>
            <Text style={styles.modalSub}>Add professional details for this teacher.</Text>

            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: 6 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSection}>Professional (required)</Text>

              <Text style={styles.modalLabel}>Designation *</Text>
              <TextInput
                value={designation}
                onChangeText={setDesignation}
                placeholder="e.g. Senior Teacher"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Qualification *</Text>
              <TextInput
                value={qualification}
                onChangeText={setQualification}
                placeholder="e.g. M.Sc., B.Ed."
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Experience years *</Text>
              <TextInput
                value={experienceYears}
                onChangeText={setExperienceYears}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.modalInput}
              />
              <Text style={styles.modalHint}>Use a number (e.g. 0, 3, 10).</Text>

              <Text style={styles.modalLabel}>Languages (comma separated)</Text>
              <TextInput
                value={languages}
                onChangeText={setLanguages}
                placeholder="English, Hindi"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Short professional bio"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={[styles.modalInput, styles.modalTextArea]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={[styles.modalSection, { marginTop: 14 }]}>Personal (optional)</Text>

              <Text style={styles.modalLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {(['male', 'female', 'other'] as const).map((g) => {
                  const on = gender === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setGender(on ? '' : g)}
                      style={({ pressed }) => [styles.genderChip, on && styles.genderChipOn, pressed && styles.modalBtnPressed]}
                    >
                      <Text style={[styles.genderChipText, on && styles.genderChipTextOn]}>{g.toUpperCase()}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.modalLabel}>Date of birth (YYYY-MM-DD)</Text>
              <Pressable
                onPress={() => setIsDobPickerOpen(true)}
                style={({ pressed }) => [
                  styles.modalInput,
                  styles.dobRow,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <Text style={dobDate ? styles.dobValue : styles.dobPlaceholder}>
                  {dobDate ? dobDate.toISOString().slice(0, 10) : 'Select a date'}
                </Text>
              </Pressable>
              <Text style={styles.modalHint}>Leave blank if unknown.</Text>

              {isDobPickerOpen ? (
                <DateTimePicker
                  value={dobDate ?? new Date(2000, 0, 1)}
                  mode="date"
                  display="default"
                  onChange={(event, selected) => {
                    setIsDobPickerOpen(false);
                    // 'selected' is undefined when dismissed.
                    if (selected) setDobDate(selected);
                  }}
                />
              ) : null}

              <Text style={styles.modalLabel}>Address</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Street, City, State"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={[styles.modalInput, styles.modalTextArea]}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => {
                  setCreateOpen(false);
                  resetCreateForm();
                }}
                style={({ pressed }) => [styles.modalBtn, pressed && styles.modalBtnPressed]}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                style={({ pressed }) => [styles.modalBtnPrimary, pressed && styles.modalBtnPressed, createMutation.isPending && styles.modalBtnDisabled]}
              >
                <Text style={styles.modalBtnPrimaryText}>{createMutation.isPending ? 'Creating…' : 'Create'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setEditOpen(false);
          resetEditForm();
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit teacher profile</Text>
            <Text style={styles.modalSub}>Update professional and personal details.</Text>

            <ScrollView
              style={{ maxHeight: 520 }}
              contentContainerStyle={{ paddingBottom: 6 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalSection}>Professional (required)</Text>

              <Text style={styles.modalLabel}>Designation *</Text>
              <TextInput
                value={editDesignation}
                onChangeText={setEditDesignation}
                placeholder="e.g. Senior Teacher"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Qualification *</Text>
              <TextInput
                value={editQualification}
                onChangeText={setEditQualification}
                placeholder="e.g. M.Sc., B.Ed."
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Experience years *</Text>
              <TextInput
                value={editExperienceYears}
                onChangeText={setEditExperienceYears}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.modalInput}
              />
              <Text style={styles.modalHint}>Use a number (e.g. 0, 3, 10).</Text>

              <Text style={styles.modalLabel}>Languages (comma separated)</Text>
              <TextInput
                value={editLanguages}
                onChangeText={setEditLanguages}
                placeholder="English, Hindi"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Bio</Text>
              <TextInput
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Short professional bio"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={[styles.modalInput, styles.modalTextArea]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={[styles.modalSection, { marginTop: 14 }]}>Personal (optional)</Text>

              <Text style={styles.modalLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {(['male', 'female', 'other'] as const).map((g) => {
                  const on = editGender === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setEditGender(on ? '' : g)}
                      style={({ pressed }) => [styles.genderChip, on && styles.genderChipOn, pressed && styles.modalBtnPressed]}
                    >
                      <Text style={[styles.genderChipText, on && styles.genderChipTextOn]}>{g.toUpperCase()}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.modalLabel}>Date of birth (YYYY-MM-DD)</Text>
              <Pressable
                onPress={() => setIsEditDobPickerOpen(true)}
                style={({ pressed }) => [
                  styles.modalInput,
                  styles.dobRow,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <Text style={editDobDate ? styles.dobValue : styles.dobPlaceholder}>
                  {editDobDate ? editDobDate.toISOString().slice(0, 10) : 'Select a date'}
                </Text>
              </Pressable>
              <Text style={styles.modalHint}>Leave blank if unknown.</Text>

              {isEditDobPickerOpen ? (
                <DateTimePicker
                  value={editDobDate ?? new Date(2000, 0, 1)}
                  mode="date"
                  display="default"
                  onChange={(event, selected) => {
                    setIsEditDobPickerOpen(false);
                    if (selected) setEditDobDate(selected);
                  }}
                />
              ) : null}

              <Text style={styles.modalLabel}>Address</Text>
              <TextInput
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Street, City, State"
                placeholderTextColor={BATCH_UI.TEXT_DIM}
                style={[styles.modalInput, styles.modalTextArea]}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => {
                  setEditOpen(false);
                  resetEditForm();
                }}
                style={({ pressed }) => [styles.modalBtn, pressed && styles.modalBtnPressed]}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => editMutation.mutate()}
                disabled={editMutation.isPending}
                style={({ pressed }) => [
                  styles.modalBtnPrimary,
                  pressed && styles.modalBtnPressed,
                  editMutation.isPending && styles.modalBtnDisabled,
                ]}
              >
                <Text style={styles.modalBtnPrimaryText}>{editMutation.isPending ? 'Updating…' : 'Update'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={BATCH_UI.ACCENT} />
          <Text style={styles.loadingText}>Loading teacher profile…</Text>
        </View>
      ) : error && !isTeacherNotFound ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Could not load teacher profile</Text>
          <Text style={styles.emptySub}>{error.message}</Text>
          <Pressable onPress={() => query.refetch()} style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : !teacher ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No teacher profile found</Text>
          <Text style={styles.emptySub}>This teacher may not have a profile created yet.</Text>
          <Pressable
            onPress={() => {
              if (typeof businessId !== 'number') {
                showToast('Missing business context', 'error');
                return;
              }
              resetCreateForm();
              setCreateOpen(true);
            }}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
          >
            <Text style={styles.retryText}>Create profile</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.headerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name || user?.email || 'T').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {user ? displayName(user) : `Teacher #${userId}`}
              </Text>
              {user?.email ? (
                <Text style={styles.headerSub} numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>TEACHER</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={openEdit}
              style={({ pressed }) => [
                styles.editProfileBtn,
                pressed && styles.editProfileBtnPressed,
              ]}
            >
              <Text style={styles.editProfileBtnText}>Edit profile</Text>
            </Pressable>
          </View>

          <Section title="Professional">
            <InfoRow label="Designation" value={teacher.designation ?? null} />
            <InfoRow label="Qualification" value={teacher.qualification ?? null} />
            <InfoRow
              label="Experience"
              value={typeof teacher.experienceYears === 'number' ? `${teacher.experienceYears} years` : null}
            />
            <InfoRow label="Languages" value={teacher.languages?.length ? teacher.languages.join(', ') : null} />
            <InfoRow label="Bio" value={teacher.bio ?? null} />
          </Section>

          <Section title="Personal">
            <InfoRow label="Gender" value={teacher.gender ?? null} />
            <InfoRow label="DOB" value={formatDate(teacher.dob) ?? null} />
            <InfoRow label="Address" value={teacher.address ?? null} />
          </Section>

          <Text style={styles.footerNote}>
            Teacher ID: {teacher.id} · User ID: {teacher.userId} · Business ID: {teacher.businessId}
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BATCH_UI.BG,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: BATCH_UI.TEXT_MUTED,
    fontWeight: '800',
  },
  headerCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  editProfileBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  editProfileBtnPressed: { opacity: 0.92 },
  editProfileBtnText: { color: BATCH_UI.TEXT, fontWeight: '900', fontSize: 14 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 211, 238, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#22d3ee',
    fontWeight: '900',
    fontSize: 18,
  },
  headerTitle: {
    color: BATCH_UI.TEXT,
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  headerSub: {
    marginTop: 4,
    color: BATCH_UI.TEXT_MUTED,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.35)',
  },
  badgeText: {
    color: '#67e8f9',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  section: {
    marginTop: 10,
  },
  sectionLabel: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    gap: 6,
  },
  infoLabel: {
    color: BATCH_UI.TEXT_DIM,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: BATCH_UI.TEXT,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  emptyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  emptyTitle: {
    color: BATCH_UI.TEXT,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  emptySub: {
    color: BATCH_UI.TEXT_MUTED,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  retryBtnPressed: {
    opacity: 0.9,
  },
  retryText: {
    color: BATCH_UI.TEXT,
    fontWeight: '800',
  },
  footerNote: {
    marginTop: 14,
    color: BATCH_UI.TEXT_DIM,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 16,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.CARD,
    padding: 16,
  },
  modalTitle: { color: BATCH_UI.TEXT, fontSize: 18, fontWeight: '900' },
  modalSub: { color: BATCH_UI.TEXT_MUTED, marginTop: 6, marginBottom: 12, lineHeight: 20 },
  modalSection: {
    color: BATCH_UI.TEXT,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.2,
    marginTop: 6,
    marginBottom: 2,
  },
  modalLabel: { color: BATCH_UI.TEXT_DIM, fontWeight: '900', fontSize: 11, letterSpacing: 1, marginTop: 10, textTransform: 'uppercase' },
  modalHint: {
    marginTop: 6,
    color: BATCH_UI.TEXT_DIM,
    fontWeight: '700',
    lineHeight: 18,
  },
  modalInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    borderRadius: 14,
    backgroundColor: BATCH_UI.BG_ELEVATED,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: BATCH_UI.TEXT,
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dobValue: {
    color: BATCH_UI.TEXT,
    fontWeight: '700',
  },
  dobPlaceholder: {
    color: BATCH_UI.TEXT_DIM,
    fontWeight: '700',
  },
  modalTextArea: {
    minHeight: 74,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  genderChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  genderChipOn: {
    borderColor: 'rgba(34, 211, 238, 0.35)',
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
  },
  genderChipText: { color: BATCH_UI.TEXT_MUTED, fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  genderChipTextOn: { color: '#67e8f9' },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BATCH_UI.BORDER_STRONG,
    backgroundColor: BATCH_UI.BG_ELEVATED,
  },
  modalBtnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: BATCH_UI.PRIMARY_BTN,
    borderWidth: 1,
    borderColor: BATCH_UI.PRIMARY_BTN_BORDER,
  },
  modalBtnDisabled: { opacity: 0.75 },
  modalBtnPressed: { opacity: 0.92 },
  modalBtnText: { color: BATCH_UI.TEXT, fontWeight: '900' },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '900' },
});

