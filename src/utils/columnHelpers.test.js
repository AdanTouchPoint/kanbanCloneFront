import { describe, it, expect } from 'vitest';
import { getCompletedColumn, isCompletedColumn } from '@/utils/columnHelpers';

describe('columnHelpers', () => {
  const columns = [
    { id: '1', title: 'Backlog' },
    { id: '2', title: 'Por Hacer' },
    { id: '3', title: 'En Progreso' },
    { id: '4', title: 'Completado' },
  ];

  describe('getCompletedColumn', () => {
    it('detects "Completado" by Spanish keyword', () => {
      expect(getCompletedColumn(columns)?.id).toBe('4');
    });

    it('detects "Done" by English keyword', () => {
      const cols = [{ id: 'a', title: 'To Do' }, { id: 'b', title: 'Done' }];
      expect(getCompletedColumn(cols)?.id).toBe('b');
    });

    it('detects by partial match', () => {
      const cols = [{ id: 'a', title: 'Trabajo terminado' }];
      expect(getCompletedColumn(cols)?.id).toBe('a');
    });

    it('returns null when no completed column exists', () => {
      const cols = [{ id: 'a', title: 'Backlog' }, { id: 'b', title: 'Por Hacer' }];
      expect(getCompletedColumn(cols)).toBeNull();
    });

    it('handles empty input', () => {
      expect(getCompletedColumn([])).toBeNull();
      expect(getCompletedColumn(undefined)).toBeNull();
    });

    it('is case-insensitive', () => {
      const cols = [{ id: 'a', title: 'DONE' }];
      expect(getCompletedColumn(cols)?.id).toBe('a');
    });
  });

  describe('isCompletedColumn', () => {
    it('returns true when columnId matches', () => {
      expect(isCompletedColumn('4', columns)).toBe(true);
    });

    it('returns false when columnId does not match', () => {
      expect(isCompletedColumn('2', columns)).toBe(false);
    });

    it('returns false for empty input', () => {
      expect(isCompletedColumn(null, columns)).toBe(false);
      expect(isCompletedColumn('', columns)).toBe(false);
    });
  });
});
