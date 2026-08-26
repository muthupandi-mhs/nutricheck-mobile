import { ApiError, type ProblemDetails, type ProblemType } from '../types';

/**
 * The server sends `type` as an absolute URI:
 *
 *     "type": "https://api.nutricheck.app/problems/unauthorized"
 *
 * `isProblem()` in ../types compares against the BARE slug `'unauthorized'`,
 * and every screen's failure branch goes through it. Left as a URI, none of
 * those comparisons ever match — no crash, no warning, just the generic error
 * message on a screen that had a specific one written for it.
 *
 * So the transport strips the prefix on the way in, and this is the only place
 * that knows the URI form exists.
 */
export const PROBLEM_BASE_URI = 'https://api.nutricheck.app/problems/';

/** Anything unrecognised keeps its own text; a slug we do not know is not an error. */
export function toProblemType(raw: unknown): ProblemType | string {
  if (typeof raw !== 'string') return 'internal-error';
  return raw.startsWith(PROBLEM_BASE_URI)
    ? raw.slice(PROBLEM_BASE_URI.length)
    : raw;
}

/**
 * Build an ApiError from a response body.
 *
 * Tolerant on purpose: a 502 from a proxy, an HTML error page or a truncated
 * body all have to become an ApiError with a usable `title`, because the
 * screens render `problem.title` verbatim and "undefined" is not a message.
 */
export function toApiError(status: number, body: unknown): ApiError {
  const problem = (body ?? {}) as Partial<ProblemDetails>;

  return new ApiError({
    ...problem,
    type: toProblemType(problem.type),
    title: problem.title ?? fallbackTitle(status),
    status: typeof problem.status === 'number' ? problem.status : status,
  });
}

/**
 * Used only when the server sent no usable problem document. Deliberately
 * plain: the user is reading this, so it says what happened, not which layer
 * it happened in.
 */
function fallbackTitle(status: number): string {
  if (status === 401) return 'Please sign in again';
  if (status === 403) return 'Not allowed';
  if (status === 404) return 'Not found';
  if (status === 429) return 'Too many attempts';
  if (status >= 500) return 'Something went wrong';
  return 'Request failed';
}
