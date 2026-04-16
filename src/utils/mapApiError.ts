export type AppError = {
  message: string;
  statusCode?: number;
  apiCode?: string;
};

type ApiErrorLike = {
  message?: string;
  statusCode?: number;
  apiCode?: string;
};

export function mapApiError(error: unknown): AppError {
  if (typeof error === 'object' && error !== null) {
    const err = error as ApiErrorLike;
    return {
      message: err.message || 'Request failed',
      statusCode: err.statusCode,
      apiCode: err.apiCode,
    };
  }

  if (typeof error === 'string') return { message: error };
  return { message: 'Something went wrong' };
}

