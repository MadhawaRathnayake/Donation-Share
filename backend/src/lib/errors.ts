import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from './env';

/**
 * Every failure leaves the API in the shape the frontend's `toApiError` helper
 * reads (frontend/src/lib/api.ts):
 *
 *   { code: string, message: string, fieldErrors?: Record<string, string> }
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const unauthenticated = (message = 'Sign in to continue.') =>
  new AppError(401, 'UNAUTHENTICATED', message);

export const forbidden = (message = 'You do not have access to this action.') =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'The requested resource was not found.') =>
  new AppError(404, 'NOT_FOUND', message);

export const conflict = (code: string, message: string) => new AppError(409, code, message);

export const validationFailed = (fieldErrors: Record<string, string>, message = 'Please correct the highlighted fields.') =>
  new AppError(400, 'VALIDATION_ERROR', message, fieldErrors);

/** Flattens a Zod issue list into the flat `field -> message` map the UI renders. */
export const zodFieldErrors = (error: ZodError): Record<string, string> => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'form';
    if (!fieldErrors[path]) fieldErrors[path] = issue.message;
  }
  return fieldErrors;
};

/** 404 handler for unmatched routes. Registered after all routers. */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, 'NOT_FOUND', `No route matches ${req.method} ${req.originalUrl}`));
};

/**
 * Central error handler. Express 5 forwards rejected promises from async route
 * handlers here automatically, so controllers do not need try/catch blocks.
 */
export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    const appError = validationFailed(zodFieldErrors(error));
    res.status(appError.status).json({
      code: appError.code,
      message: appError.message,
      fieldErrors: appError.fieldErrors,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      code: error.code,
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    });
    return;
  }

  console.error('[unhandled]', error);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong on our side. Please try again.',
    ...(env.isProduction ? {} : { detail: error instanceof Error ? error.message : String(error) }),
  });
};
