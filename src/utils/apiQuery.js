// ─── Payload CMS query helpers ─────────────────────────────────────────────────

/**
 * Build a `where[id][in]=id1,id2,id3` query string for Payload CMS filters.
 * Returns an empty string if `ids` is empty.
 */
export const buildWhereInParam = (ids) => {
  if (!ids || ids.length === 0) return '';
  return `where[id][in]=${ids.map(encodeURIComponent).join(',')}`;
};
