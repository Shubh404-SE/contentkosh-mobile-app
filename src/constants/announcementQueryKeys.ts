export const ANNOUNCEMENT_QUERY_KEYS = {
  all: ['announcements'] as const,
  bundle: () => [...ANNOUNCEMENT_QUERY_KEYS.all, 'bundle'] as const,
  detail: (id: number) => [...ANNOUNCEMENT_QUERY_KEYS.all, 'detail', id] as const,
};
