import { describe, it, expect } from 'vitest';
import { transformBoard, transformColumn, transformTask, transformChecklist, transformUser } from '@/services/api';

describe('transformers', () => {
  describe('transformBoard', () => {
    it('flattens relationship ids', () => {
      const board = {
        id: 'b1',
        name: 'Test',
        columnsID: ['c1', 'c2'],
        tasksID: [{ id: 't1' }, 't2'],
        autorID: 'u1',
        membersID: [{ id: 'u2' }, 'u3'],
        ownerId: 'u1',
      };
      expect(transformBoard(board)).toEqual({
        id: 'b1',
        title: 'Test',
        description: '',
        columnIds: ['c1', 'c2'],
        taskIds: ['t1', 't2'],
        authorId: 'u1',
        memberIds: ['u2', 'u3'],
        ownerId: 'u1',
      });
    });
  });

  describe('transformColumn', () => {
    it('strips the uniqueness suffix', () => {
      const col = { id: 'c1', title: 'Por Hacer‖1234567', color: 'blue' };
      expect(transformColumn(col)).toEqual({
        id: 'c1',
        title: 'Por Hacer',
        color: 'blue',
        _rawTitle: 'Por Hacer‖1234567',
      });
    });

    it('keeps title without suffix intact', () => {
      const col = { id: 'c1', title: 'Backlog', color: 'purple' };
      expect(transformColumn(col).title).toBe('Backlog');
    });
  });

  describe('transformTask', () => {
    it('parses JSON state blob', () => {
      const task = {
        id: 't1',
        name: 'Test',
        state: JSON.stringify({
          description: 'A description',
          priority: 'high',
          color: '#ff0000',
          colorName: 'Urgent',
        }),
        due: '2026-12-31T00:00:00.000Z',
        columnsID: 'c1',
        autorID: 'u1',
        membersID: 'u2',
        checkListsID: ['cl1'],
      };
      expect(transformTask(task)).toMatchObject({
        id: 't1',
        title: 'Test',
        description: 'A description',
        priority: 'high',
        color: '#ff0000',
        colorName: 'Urgent',
        dueDate: '2026-12-31',
        columnId: 'c1',
        assigneeId: 'u2',
        autorId: 'u1',
        subtasks: [],
        checklistIds: ['cl1'],
      });
    });

    it('falls back to defaults for invalid state', () => {
      const task = { id: 't1', name: 'Test', state: 'not-json', columnsID: 'c1' };
      expect(transformTask(task)).toMatchObject({
        description: '',
        priority: 'medium',
        color: null,
        colorName: '',
      });
    });

    it('falls back to defaults when state is null', () => {
      const task = { id: 't1', name: 'Test', state: null, columnsID: 'c1' };
      expect(transformTask(task)).toMatchObject({
        description: '',
        priority: 'medium',
      });
    });

    it('falls back to defaults when state is an array', () => {
      const task = { id: 't1', name: 'Test', state: '[]', columnsID: 'c1' };
      expect(transformTask(task)).toMatchObject({
        description: '',
        priority: 'medium',
      });
    });
  });

  describe('transformChecklist', () => {
    it('maps state to completed', () => {
      const done = transformChecklist({ id: 'cl1', name: 'A', state: 'completed' });
      expect(done.completed).toBe(true);

      const open = transformChecklist({ id: 'cl2', name: 'B', state: 'pending' });
      expect(open.completed).toBe(false);
    });
  });

  describe('transformUser', () => {
    it('falls back to email when name is missing', () => {
      expect(transformUser({ id: 'u1', email: 'a@b.com' }).name).toBe('a@b.com');
    });

    it('uses name when available', () => {
      expect(transformUser({ id: 'u1', email: 'a@b.com', name: 'Alice' }).name).toBe('Alice');
    });
  });
});
