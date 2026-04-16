/**
 * Mirrors backend `AttemptStatus` and `LockedReason` (see contentkosh-backend `test-enums.ts`).
 * Used for student test list actions (start / resume / view result).
 */
export const ATTEMPT_STATUS = {
  IN_PROGRESS: 0,
  SUBMITTED: 1,
  AUTO_SUBMITTED: 2,
  EXPIRED: 3,
} as const;

export const LOCKED_REASON = {
  NOT_STARTED: 0,
  DEADLINE_PASSED: 1,
  ALREADY_ATTEMPTED: 2,
} as const;

export function isAttemptFinished(status: number | null | undefined): boolean {
  if (status == null) return false;
  return (
    status === ATTEMPT_STATUS.SUBMITTED ||
    status === ATTEMPT_STATUS.AUTO_SUBMITTED ||
    status === ATTEMPT_STATUS.EXPIRED
  );
}

export function isAttemptInProgress(status: number | null | undefined): boolean {
  return status === ATTEMPT_STATUS.IN_PROGRESS;
}

export function lockedReasonLabel(reason: number | null | undefined): string {
  switch (reason) {
    case LOCKED_REASON.NOT_STARTED:
      return 'Not started yet';
    case LOCKED_REASON.DEADLINE_PASSED:
      return 'Deadline passed';
    case LOCKED_REASON.ALREADY_ATTEMPTED:
      return 'Already attempted';
    default:
      return 'Unavailable';
  }
}
