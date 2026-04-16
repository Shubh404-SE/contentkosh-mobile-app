export type AnnouncementScope = 'COURSE' | 'BATCH';

export type AnnouncementTarget = {
  courseId?: number | null;
  batchId?: number | null;
};

export type Announcement = {
  id?: number;
  heading?: string;
  content?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  businessId?: number;
  visibleToAdmins?: boolean;
  visibleToTeachers?: boolean;
  visibleToStudents?: boolean;
  scope?: AnnouncementScope;
  targetAllCourses?: boolean;
  targetAllBatches?: boolean;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
  targets?: AnnouncementTarget[];
  createdByUser?: {
    id?: number;
    name?: string;
    email?: string;
  } | null;
};

export type CreateAnnouncementRequest = {
  heading: string;
  content: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  visibleToAdmins?: boolean;
  visibleToTeachers?: boolean;
  visibleToStudents?: boolean;
  scope: AnnouncementScope;
  targetAllCourses?: boolean;
  targetAllBatches?: boolean;
  courseIds?: number[];
  batchIds?: number[];
};

export type UpdateAnnouncementRequest = {
  heading?: string;
  content?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  visibleToAdmins?: boolean;
  visibleToTeachers?: boolean;
  visibleToStudents?: boolean;
  scope?: AnnouncementScope;
  targetAllCourses?: boolean;
  targetAllBatches?: boolean;
  courseIds?: number[];
  batchIds?: number[];
};

export type AnnouncementBundleData = {
  received?: Announcement[];
  managed?: Announcement[];
};
