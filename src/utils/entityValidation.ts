export type Validator = (value: string) => string | null;

export const isRequired =
  (label: string): Validator =>
  (value) => {
    if (!value || !value.trim()) return `${label} is required`;
    return null;
  };

export const hasMaxLength =
  (max: number, label: string): Validator =>
  (value) => {
    if (value.trim().length > max) return `${label} cannot exceed ${max} characters`;
    return null;
  };

export const hasMinLength =
  (min: number, label: string): Validator =>
  (value) => {
    if (value.trim().length < min) return `${label} must be at least ${min} alphabets.`;
    return null;
  };

export const containsAlphabet =
  (label: string): Validator =>
  (value) => {
    if (!/[a-zA-Z]/.test(value)) return `${label} must contain at least one alphabet`;
    return null;
  };

export const hasValidCharacters =
  (label: string): Validator =>
  (value) => {
    if (!/^[a-zA-Z0-9\s_-]+$/.test(value)) {
      return `${label} can only contain letters, numbers, spaces, hyphens (-), and underscores (_)`;
    }
    return null;
  };

export function validate(value: string, validators: Validator[]): string | null {
  for (const v of validators) {
    const err = v(value);
    if (err) return err;
  }
  return null;
}

/**
 * Validates names (exam, course, subject). Mirrors web defaults: max 50 unless overridden.
 */
export function validateEntityName(
  name: string,
  entityLabel: string = 'Name',
  maxLength: number = 50,
  minLength?: number
): string | null {
  const trimmedName = name ? name.trim() : '';

  return validate(trimmedName, [
    isRequired(entityLabel),
    ...(typeof minLength === 'number' ? [hasMinLength(minLength, entityLabel)] : []),
    hasMaxLength(maxLength, entityLabel),
    containsAlphabet(entityLabel),
    hasValidCharacters(entityLabel),
  ]);
}

export function validateDateRange(startDate: string, endDate: string): string | null {
  if (!startDate && !endDate) return null;
  if (!startDate || !endDate) return 'Start Date and End Date must be selected together';
  if (new Date(startDate) > new Date(endDate)) return 'Start Date must be before End Date';
  return null;
}
