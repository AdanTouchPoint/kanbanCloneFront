// ─── Column helpers ───────────────────────────────────────────────────────────

const COMPLETED_KEYWORDS = ['completado', 'done', 'terminado', 'finished', 'listo'];

/**
 * Detect which column represents the "completed" state in a given board,
 * by matching the title against known completion keywords.
 * Returns the column object or `null` if not found.
 */
export const getCompletedColumn = (columns = []) => {
  return (
    columns.find((col) => {
      const t = (col.title || '').toLowerCase().trim();
      return COMPLETED_KEYWORDS.some((kw) => t === kw || t.includes(kw));
    }) || null
  );
};

/**
 * Returns true if a given column id matches the "completed" column
 * for the supplied columns list.
 */
export const isCompletedColumn = (columnId, columns = []) => {
  if (!columnId) return false;
  return getCompletedColumn(columns)?.id === columnId;
};
