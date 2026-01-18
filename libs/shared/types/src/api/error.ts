/**
 * API Error Types
 *
 * Consistent error response format for all API endpoints.
 * Includes correlation IDs for tracing.
 *
 * @see specs/operational-standards.md
 */

/**
 * Standard API error response
 */
export interface ApiError {
  /** HTTP status code */
  statusCode: number;
  /** Human-readable error message */
  message: string;
  /** HTTP status text (e.g., "NOT_FOUND", "BAD_REQUEST") */
  error: string;
  /** ISO timestamp of when the error occurred */
  timestamp: string;
  /** Request path that caused the error */
  path: string;
  /** Unique correlation ID for tracing (UUID) */
  correlationId: string;
}

/**
 * Extended API error with translation key for i18n
 */
export interface ApiErrorWithKey extends ApiError {
  /** Translation key for localized error messages */
  messageKey?: string;
}

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  /** Field name that failed validation */
  field: string;
  /** Validation error message */
  message: string;
  /** Value that failed validation (if safe to include) */
  value?: unknown;
  /** Validation constraint that failed */
  constraint?: string;
}

/**
 * API error with validation details
 */
export interface ApiValidationError extends ApiError {
  /** List of validation errors */
  validationErrors: ValidationErrorDetail[];
}

/**
 * HTTP status codes commonly used in API
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

/**
 * HTTP status text mapping
 */
export const HttpStatusText: Record<HttpStatusCode, string> = {
  [HttpStatus.OK]: 'OK',
  [HttpStatus.CREATED]: 'CREATED',
  [HttpStatus.NO_CONTENT]: 'NO_CONTENT',
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

/**
 * Common error codes for MES-specific errors
 */
export const MESErrorCodes = {
  // Production Entry Errors
  PROD_001: 'PROD_001', // Quantity exceeds remaining
  PROD_002: 'PROD_002', // Work order not released
  PROD_003: 'PROD_003', // SAP connection failed
  PROD_004: 'PROD_004', // Batch number generation failed

  // Activity Tracking Errors
  ACT_001: 'ACT_001', // Invalid state transition
  ACT_002: 'ACT_002', // Break code required for DUR
  ACT_003: 'ACT_003', // Duplicate BAS without BIT

  // Authentication Errors
  AUTH_001: 'AUTH_001', // Invalid credentials
  AUTH_002: 'AUTH_002', // Session expired
  AUTH_003: 'AUTH_003', // Station not authorized

  // General Errors
  GEN_001: 'GEN_001', // Resource not found
  GEN_002: 'GEN_002', // Database connection error
  GEN_003: 'GEN_003', // Validation error
} as const;

export type MESErrorCode = (typeof MESErrorCodes)[keyof typeof MESErrorCodes];

/**
 * MES error message mapping (Turkish)
 */
export const MESErrorMessages: Record<MESErrorCode, string> = {
  [MESErrorCodes.PROD_001]: 'Girilen miktar kalan miktari asamaz',
  [MESErrorCodes.PROD_002]: 'Is emri serbest birakilmamis',
  [MESErrorCodes.PROD_003]: 'SAP baglanti hatasi, lutfen tekrar deneyin',
  [MESErrorCodes.PROD_004]: 'Parti numarasi olusturulamadi',
  [MESErrorCodes.ACT_001]: 'Bu islem su an yapilamaz',
  [MESErrorCodes.ACT_002]: 'Mola nedeni secmeniz gerekiyor',
  [MESErrorCodes.ACT_003]: 'Zaten bu iste calisiyorsunuz',
  [MESErrorCodes.AUTH_001]: 'Gecersiz kimlik bilgileri',
  [MESErrorCodes.AUTH_002]: 'Oturum suresi doldu',
  [MESErrorCodes.AUTH_003]: 'Bu istasyon icin yetkiniz yok',
  [MESErrorCodes.GEN_001]: 'Kaynak bulunamadi',
  [MESErrorCodes.GEN_002]: 'Veritabani baglanti hatasi',
  [MESErrorCodes.GEN_003]: 'Dogrulama hatasi',
};

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data (if successful) */
  data?: T;
  /** Error details (if failed) */
  error?: ApiError;
}
