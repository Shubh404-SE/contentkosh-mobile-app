/** Mirrors backend `announcement.constants` socket event names. */
export const ANNOUNCEMENT_SOCKET_EVENTS = {
  NEW: 'announcement:new',
  UPDATED: 'announcement:updated',
  DELETED: 'announcement:deleted',
  UNAUTHORIZED: 'unauthorized',
} as const;

export type AnnouncementSocketPayload = {
  id?: number;
  businessId?: number;
};
