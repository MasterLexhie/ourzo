/** Full slug from free text, e.g. "Carol Labs" -> "carol-labs". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Per-keystroke sanitizer: lowercase and drop disallowed characters only.
 * Leading/trailing dashes are kept while typing (so "my-" can become
 * "my-team") and trimmed by `finalizeSlug` on blur/submit.
 */
export function sanitizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-");
}

export function finalizeSlug(value: string): string {
  return sanitizeSlugInput(value).replace(/^-+|-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
