/** Client-side signup rules aligned with `contentkosh-web/app/(auth)/register/page.tsx`. */

export const REGISTER_VALIDATION = {
  INSTITUTE_NAME_MIN: 3,
  INSTITUTE_NAME_MAX: 100,
  SLUG_MIN: 3,
  SLUG_MAX: 100,
  FULL_NAME_MIN: 3,
  FULL_NAME_MAX: 100,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 20,
  /** Allowed special characters in password (same set as web). */
  PASSWORD_SPECIAL_CHARSET: '!@#$%^&*',
  SLUG_CHECK_DEBOUNCE_MS: 500,
} as const;
