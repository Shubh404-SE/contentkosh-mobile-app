import type { UserRole } from '../api/apiTypes';

export type BatchUserRecord = {
  userId?: number;
  isActive?: boolean;
  user?: {
    id?: number;
    name?: string | null;
    email?: string | null;
    role?: UserRole;
  };
};

export type BatchRecord = {
  id: number;
  codeName?: string;
  displayName?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  courseId?: number;
  createdAt?: string;
  course?: {
    id?: number;
    name?: string;
    exam?: { id?: number; name?: string };
  };
  batchUsers?: BatchUserRecord[];
};

export type CourseOption = {
  id: number;
  name: string;
  examId?: number;
  examName?: string;
};
