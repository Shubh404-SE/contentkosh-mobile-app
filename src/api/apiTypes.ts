export type ApiCode =
  | 'SUCCESS'
  | 'SUCCESS_CREATED'
  | 'ERR_GENERIC'
  | 'ERR_NOT_FOUND'
  | 'ERR_BAD_REQUEST'
  | 'ERR_UNAUTHORIZED'
  | 'ERR_FORBIDDEN'
  | 'ERR_SERVER_ERROR';

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  apiCode: ApiCode;
};

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'USER';

export type User = {
  id: number;
  email: string;
  name?: string;
  role: UserRole;
  businessId?: number | null;
};

export type Business = {
  id: number;
  /** Legacy / alias; API primarily returns `instituteName`. */
  name?: string;
  instituteName?: string;
  slug?: string;
  /** Logo URL or server-relative path. */
  logo?: string | null;
  tagline?: string | null;
};

