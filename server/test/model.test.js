import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  completeAll,
  filterTasks,
  isValidDate,
  normaliseTitle,
  queryTasks,
  sanitiseTasks,
  searchTasks,
  sortTasks,
  stats,
  validateNewTask,
  validateTaskUpdate
} from '../src/model.js';

const make = (title, options = {}) => validateNewTask({ title, ...options }).task;

describe('normaliseTitle', () => {
  it('trims and collapses whitespace', () => {
    assert.equal(normaliseTitle('  buy   milk \n'), 'buy milk');
  });

  it('returns null for blank input', () => {
    for (const value of ['', '   ', null, undefined]) {
      assert.equal(normaliseTitle(value), null);
    }
  });

  it('caps the length at 200 characters', () => {
    assert.equal(normaliseTitle('x'.repeat(300)).length, 200);
  });
});

describe('isValidDate', () => {
  it('accepts real ISO dates and rejects everything else', () => {
    assert.ok(isValidDate('2026-02-28'));
    assert.ok(!isValidDate('2026-02-30'));
    assert.ok(!isValidDate('2026-13-01'));
    assert.ok(!isValidDate('2026-1-1'));
    assert.ok(!isValidDate(null));
  });
});

describe('validateNewTask', () => {
  it('builds a task with defaults', () => {
    const { task, errors } = validateNewTask({ title: 'Write tests' });
    assert.equal(errors, undefined);
    assert.equal(task.title, 'Write tests');
    assert.equal(task.completed, false);
    assert.equal(task.priority, 'normal');
    assert.equal(task.dueDate, null);
    assert.equal(task.completedAt, null);
    assert.ok(task.id);
    assert.equal(task.createdAt, task.updatedAt);
  });

  it('reports every bad field at once', () => {
    const { task, errors } = validateNewTask({ title: '  ', priority: 'urgent', dueDate: '1/2/26' });
    assert.equal(task, undefined);
    assert.deepEqual(Object.keys(errors).sort(), ['dueDate', 'priority', 'title']);
  });

  it('accepts valid priority and due date', () => {
    const { task } = validateNewTask({ title: 'a', priority: 'high', dueDate: '2026-01-31' });
    assert.equal(task.priority, 'high');
    assert.equal(task.dueDate, '2026-01-31');
  });

  it('gives every task a distinct id', () => {
    const ids = new Set(['a', 'b', 'c', 'd'].map((title) => make(title).id));
    assert.equal(ids.size, 4);
  });
});

describe('validateTaskUpdate', () => {
  it('applies a partial change and leaves other fields alone', () => {
    const original = make('original', { priority: 'low' });
    const { task } = validateTaskUpdate(original, { title: '  renamed  ' });
    assert.equal(task.title, 'renamed');
    assert.equal(task.priority, 'low');
    assert.equal(task.id, original.id);
    assert.equal(task.createdAt, original.createdAt);
  });

  it('rejects an empty title rather than blanking it', () => {
    const { task, errors } = validateTaskUpdate(make('keep me'), { title: '   ' });
    assert.equal(task, undefined);
    assert.equal(errors.title, 'Title cannot be empty.');
  });

  it('clears the due date on explicit null or empty string', () => {
    const dated = make('a', { dueDate: '2026-05-05' });
    assert.equal(validateTaskUpdate(dated, { dueDate: null }).task.dueDate, null);
    assert.equal(validateTaskUpdate(dated, { dueDate: '' }).task.dueDate, null);
  });

  it('rejects a non-boolean completed flag', () => {
    assert.ok(validateTaskUpdate(make('a'), { completed: 'yes' }).errors.completed);
  });

  it('stamps completedAt on completion and clears it on reopen', () => {
    const { task: done } = validateTaskUpdate(make('a'), { completed: true });
    assert.equal(done.completed, true);
    assert.ok(done.completedAt);

    const { task: reopened } = validateTaskUpdate(done, { completed: false });
    assert.equal(reopened.completedAt, null);
  });

  it('keeps the original completion time when a completed task is edited', () => {
    const { task: done } = validateTaskUpdate(make('a'), { completed: true });
    const { task: edited } = validateTaskUpdate(done, { completed: true, title: 'renamed' });
    assert.equal(edited.completedAt, done.completedAt);
  });
});

describe('completeAll', () => {
  it('sets every task complete or active', () => {
    const list = ['a', 'b', 'c'].map((title) => make(title));
    assert.ok(completeAll(list, true).every((task) => task.completed && task.completedAt));
    assert.ok(completeAll(completeAll(list, true), false).every((task) => !task.completed));
  });

  it('does not mutate the input', () => {
    const list = [make('a')];
    completeAll(list, true);
    assert.equal(list[0].completed, false);
  });
});

describe('queries', () => {
  function sample() {
    const milk = make('Buy milk', { dueDate: '2026-01-02', priority: 'low' });
    const plumber = make('Call plumber', {
      dueDate: '2026-01-01',
      priority: 'high',
      notes: 'about the sink'
    });
    const photos = make('Archive photos', { priority: 'normal' });
    return [milk, plumber, validateTaskUpdate(photos, { completed: true }).task];
  }

  it('filters by status', () => {
    const list = sample();
    assert.equal(filterTasks(list, 'all').length, 3);
    assert.equal(filterTasks(list, 'active').length, 2);
    assert.equal(filterTasks(list, 'completed').length, 1);
  });

  it('searches titles and notes case-insensitively', () => {
    const list = sample();
    assert.deepEqual(searchTasks(list, 'MILK').map((task) => task.title), ['Buy milk']);
    assert.deepEqual(searchTasks(list, 'sink').map((task) => task.title), ['Call plumber']);
    assert.equal(searchTasks(list, '  ').length, 3);
  });

  it('sorts by due date, putting undated tasks last', () => {
    assert.deepEqual(sortTasks(sample(), 'due').map((task) => task.title), [
      'Call plumber',
      'Buy milk',
      'Archive photos'
    ]);
  });

  it('sorts by priority and alphabetically', () => {
    assert.deepEqual(sortTasks(sample(), 'priority').map((task) => task.priority), [
      'high',
      'normal',
      'low'
    ]);
    assert.deepEqual(sortTasks(sample(), 'alpha').map((task) => task.title), [
      'Archive photos',
      'Buy milk',
      'Call plumber'
    ]);
  });

  it('does not mutate the input when sorting', () => {
    const list = sample();
    const order = list.map((task) => task.title);
    sortTasks(list, 'alpha');
    assert.deepEqual(list.map((task) => task.title), order);
  });

  it('combines filter, search and sort', () => {
    const result = queryTasks(sample(), { filter: 'active', q: 'a', sort: 'alpha' });
    assert.deepEqual(result.map((task) => task.title), ['Call plumber']);
  });
});

describe('stats', () => {
  it('counts totals, overdue and due-today tasks', () => {
    const list = [
      make('past due', { dueDate: '2026-01-01' }),
      make('due today', { dueDate: '2026-06-15' }),
      make('future', { dueDate: '2026-12-31' }),
      validateTaskUpdate(make('done late', { dueDate: '2026-01-01' }), { completed: true }).task
    ];
    assert.deepEqual(stats(list, '2026-06-15'), {
      total: 4,
      completed: 1,
      active: 3,
      overdue: 1,
      dueToday: 1
    });
  });
});

describe('sanitiseTasks', () => {
  it('returns an empty list for non-array input', () => {
    for (const value of [null, undefined, 42, {}, 'tasks']) {
      assert.deepEqual(sanitiseTasks(value), []);
    }
  });

  it('drops unusable entries and repairs the rest', () => {
    const result = sanitiseTasks([
      null,
      { title: '   ' },
      { title: 'ok', priority: 'bogus', dueDate: 'bogus', completed: 1 }
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].title, 'ok');
    assert.equal(result[0].priority, 'normal');
    assert.equal(result[0].dueDate, null);
    assert.equal(result[0].completed, true);
    assert.ok(result[0].id);
    assert.ok(result[0].createdAt);
  });

  it('round-trips a real task through JSON', () => {
    const task = make('Round trip', { dueDate: '2026-05-05', priority: 'high' });
    const [restored] = sanitiseTasks(JSON.parse(JSON.stringify([task])));
    assert.deepEqual(restored, task);
  });
});
