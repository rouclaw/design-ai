const ALLOWED_URI_SEGMENT_CHARS = /^[a-zA-Z0-9_-]+$/;
const ALLOWED_URI_SEGMENT_CHARS_WITH_DOTS = /^[a-zA-Z0-9._-]+$/;

const WINDOWS_RESERVED_NAMES =
  /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(\..+)?$/i;

const RESERVED_ITEM_NAMES = new Set(["settings"]);

export interface URISegmentOptions {
  allowDots?: boolean;
  /** Set to false to keep leading/trailing hyphens/underscores (useful during live typing). Default: true. */
  trimEdges?: boolean;
  minLength?: number;
  maxLength?: number;
}

/**
 * Validate a URI segment (slug, username, filename base) for safe use in URLs.
 * Returns an error message string if invalid, or null if valid.
 *
 * With `allowDots: true`, dots are permitted (for filenames).
 * Must start and end with a letter or digit.
 */
export function validateURISegment(
  value: string,
  options?: URISegmentOptions,
): string | null {
  const { allowDots = false, minLength = 1, maxLength = 255 } = options ?? {};
  const trimmed = value.trim();

  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return `Must be between ${minLength} and ${maxLength} characters`;
  }

  const charPattern = allowDots
    ? ALLOWED_URI_SEGMENT_CHARS_WITH_DOTS
    : ALLOWED_URI_SEGMENT_CHARS;

  if (!charPattern.test(trimmed)) {
    const allowed = allowDots
      ? "letters, numbers, hyphens, underscores, and dots"
      : "letters, numbers, hyphens, and underscores";
    return `Can only contain ${allowed}`;
  }

  if (!/^[a-zA-Z0-9]/.test(trimmed) || !/[a-zA-Z0-9]$/.test(trimmed)) {
    return "Must start and end with a letter or number";
  }

  if (allowDots && (trimmed.startsWith(".") || trimmed.endsWith("."))) {
    return "Cannot start or end with a dot";
  }

  if (WINDOWS_RESERVED_NAMES.test(trimmed)) {
    return `"${trimmed}" is a reserved name`;
  }

  if (RESERVED_ITEM_NAMES.has(trimmed.toLowerCase())) {
    return `"${trimmed}" is a reserved name`;
  }

  return null;
}

/**
 * Sanitize a string into a valid URI segment.
 * Strips forbidden characters, collapses runs of hyphens, trims edges.
 *
 * With `allowDots: true`, dots are preserved (for filenames).
 */
export function sanitizeURISegment(
  value: string,
  options?: URISegmentOptions,
): string {
  const { allowDots = false, trimEdges = true, maxLength = 255 } = options ?? {};
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";

  const forbiddenPattern = allowDots ? /[^a-zA-Z0-9._-]/g : /[^a-zA-Z0-9_-]/g;

  let result = trimmed.replace(forbiddenPattern, "-");
  result = result.replace(/-{2,}/g, "-");
  if (allowDots) result = result.replace(/\.{2,}/g, ".");

  if (trimEdges) {
    const edgeChars = allowDots ? /^[._-]+|[._-]+$/g : /^[_-]+|[_-]+$/g;
    result = result.replace(edgeChars, "");
  }

  if (result.length > maxLength) {
    result = result.slice(0, maxLength);
  }

  return result;
}
