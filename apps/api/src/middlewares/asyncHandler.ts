import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express route handler so rejected promises are forwarded
 * to the Express error handler instead of crashing the process.
 *
 * Usage:
 *   router.get('/:id', asyncHandler(myController));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => any,
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
