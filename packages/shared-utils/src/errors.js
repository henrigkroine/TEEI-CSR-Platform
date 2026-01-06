export class AppError extends Error {
    statusCode;
    code;
    metadata;
    constructor(message, statusCode = 500, code, metadata) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.metadata = metadata;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class ValidationError extends AppError {
    constructor(message, metadata) {
        super(message, 400, 'VALIDATION_ERROR', metadata);
    }
}
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found', metadata) {
        super(message, 404, 'NOT_FOUND', metadata);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', metadata) {
        super(message, 401, 'UNAUTHORIZED', metadata);
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', metadata) {
        super(message, 403, 'FORBIDDEN', metadata);
    }
}
export class ConflictError extends AppError {
    constructor(message, metadata) {
        super(message, 409, 'CONFLICT', metadata);
    }
}
//# sourceMappingURL=errors.js.map