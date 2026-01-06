export declare class AppError extends Error {
    statusCode: number;
    code?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    constructor(message: string, statusCode?: number, code?: string | undefined, metadata?: Record<string, unknown> | undefined);
}
export declare class ValidationError extends AppError {
    constructor(message: string, metadata?: Record<string, unknown>);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string, metadata?: Record<string, unknown>);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string, metadata?: Record<string, unknown>);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string, metadata?: Record<string, unknown>);
}
export declare class ConflictError extends AppError {
    constructor(message: string, metadata?: Record<string, unknown>);
}
//# sourceMappingURL=errors.d.ts.map