export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', metadata);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', metadata?: Record<string, unknown>) {
    super(message, 404, 'NOT_FOUND', metadata);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', metadata?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', metadata);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', metadata?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', metadata);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', metadata);
  }
}
