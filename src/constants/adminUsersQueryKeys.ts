export const ADMIN_USERS_QUERY_KEYS = {
  users: (businessId: number) => ['adminUsers', 'business', businessId] as const,
  teacherProfileByUser: (userId: number) => ['teacherProfile', 'user', userId] as const,
} as const;

