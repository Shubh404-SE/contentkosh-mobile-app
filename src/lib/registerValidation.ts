import { REGISTER_VALIDATION } from '../constants/registerConstants';

export type RegisterFormValues = {
  instituteName: string;
  slug: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
  mobile?: string;
};

const INSTITUTE_NAME_PATTERN = /^[a-zA-Z0-9 _-]+$/;
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const FULL_NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

export function slugify(value: string, trimEnd = false): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '');

  return trimEnd ? normalized.replace(/-+$/, '') : normalized;
}

/**
 * Capitalizes each word; preserves a trailing space if the user typed one (matches web behavior).
 */
export function capitalizeNameInput(value: string): string {
  if (!value) return value;
  const hasTrailingSpace = /\s$/.test(value);
  const normalized = value.replace(/\s+/g, ' ').trim();
  const capitalized = normalized
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return hasTrailingSpace ? `${capitalized} ` : capitalized;
}

function validatePasswordRules(password: string): string | null {
  const { PASSWORD_MIN, PASSWORD_MAX, PASSWORD_SPECIAL_CHARSET } = REGISTER_VALIDATION;
  if (password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters`;
  }
  if (password.length > PASSWORD_MAX) {
    return `Password cannot exceed ${PASSWORD_MAX} characters`;
  }
  if (/\s/.test(password)) {
    return 'Password must not contain spaces';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include a number';
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return `Password must include a special character (${PASSWORD_SPECIAL_CHARSET})`;
  }
  return null;
}

/** Optional mobile: if present, require reasonable length and digits (optional leading +). */
function validateOptionalMobile(mobile: string | undefined): string | null {
  const t = (mobile ?? '').trim();
  if (!t) return null;
  if (!/^\+?[0-9]{10,15}$/.test(t)) {
    return 'Enter a valid mobile number (10–15 digits, optional leading +).';
  }
  return null;
}

/**
 * Returns the first validation error message, or `null` if the form is valid.
 */
export function validateRegisterForm(values: RegisterFormValues): string | null {
  const institute = values.instituteName.trim();
  if (!institute) {
    return 'Institute name is required.';
  }
  if (institute.length < REGISTER_VALIDATION.INSTITUTE_NAME_MIN) {
    return `Institute name must be at least ${REGISTER_VALIDATION.INSTITUTE_NAME_MIN} characters.`;
  }
  if (institute.length > REGISTER_VALIDATION.INSTITUTE_NAME_MAX) {
    return `Institute name cannot exceed ${REGISTER_VALIDATION.INSTITUTE_NAME_MAX} characters.`;
  }
  if (!INSTITUTE_NAME_PATTERN.test(institute)) {
    return 'Institute name can only contain letters, numbers, spaces, hyphens (-), and underscores (_).';
  }
  if (!/[a-zA-Z]/.test(institute)) {
    return 'Institute name must include at least one letter.';
  }

  const slug = values.slug.trim();
  if (!slug) {
    return 'URL slug is required.';
  }
  if (slug.length < REGISTER_VALIDATION.SLUG_MIN) {
    return `Slug must be at least ${REGISTER_VALIDATION.SLUG_MIN} characters.`;
  }
  if (slug.length > REGISTER_VALIDATION.SLUG_MAX) {
    return `Slug cannot exceed ${REGISTER_VALIDATION.SLUG_MAX} characters.`;
  }
  if (!SLUG_PATTERN.test(slug)) {
    return 'Slug must only contain lowercase letters, numbers, and hyphens.';
  }

  const name = values.name.trim();
  if (!name) {
    return 'Your name is required.';
  }
  if (name.length < REGISTER_VALIDATION.FULL_NAME_MIN) {
    return `Name must be at least ${REGISTER_VALIDATION.FULL_NAME_MIN} characters.`;
  }
  if (name.length > REGISTER_VALIDATION.FULL_NAME_MAX) {
    return `Name cannot exceed ${REGISTER_VALIDATION.FULL_NAME_MAX} characters.`;
  }
  if (!FULL_NAME_PATTERN.test(name)) {
    return 'Name can only contain letters and single spaces between words.';
  }

  const email = values.email.trim();
  if (!email) {
    return 'Email is required.';
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return 'Enter a valid email address.';
  }
  if (/\+{2,}/.test(email)) {
    return 'Email cannot contain multiple consecutive "+" characters.';
  }

  const mobileErr = validateOptionalMobile(values.mobile);
  if (mobileErr) return mobileErr;

  const pwErr = validatePasswordRules(values.password);
  if (pwErr) return pwErr;

  if (values.password !== values.confirmPassword) {
    return "Passwords don't match.";
  }

  if (!values.termsAccepted) {
    return 'Please accept the terms and conditions.';
  }

  return null;
}
