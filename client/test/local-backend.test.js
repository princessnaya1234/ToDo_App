/**
 * Tests for the browser-only backend. localStorage is stubbed, so these run in
 * plain Node and assert the same contract the HTTP API provides.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

function installStorage({ failing = false } = {}) {
  const data = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => {
        if (failing) throw new Error('storage disabled');
        return data.has(key) ? data.get(key) : null;
      },
      setItem: (key, value) => {
        if (failing) throw new Error('quota exceeded');
        data.set(key, value);
      }
    }
  };
  return data;
}

installStorage();
const local = await import('../src/backends/local.js');

beforeEach(() => installStorage());

const add = (title, options = {}) => local.createTask({ title, ...options });

describe('createTask', () => {
  it('stores a task and returns it', async () => {
    const { task } = await add('Buy milk', { priority: 'high' });
    assert.equal(task.title, 'Buy milk');
    assert.equal(task.priority, 'high');
    assert.equal(task.completed, false);
    assert.ok(task.id);

    const { tasks } = await local.listTasks();
    assert.deepEqual(tasks.map((t) => t.title), ['Buy milk']);
  });

  it('rejects an invalid task the same way the API does', async () => {
    await assert.rejects(() => add('   '), (error) => {
      assert.equal(error.name, 'ApiError');
      assert.equal(error.status, 400);
      assert.equal(error.details.title, 'Title is required.');
      return true;
    });
  });

  it('gives each task a distinct id', async () => {
    const a = await add('one');
    const b = await add('two');
    assert.notEqual(a.task.id, b.task.id);
  });
});

describe('listTasks', () => {
  it('filters, searches and sorts, with stats over the whole list', async () => {
    await add('Zebra', { priority: 'low' });
    const { task: apple } = await add('Apple', { priority: 'high' });
    await local.updateTask(apple.id, { completed: true });

    const alpha = await local.listTasks({ sort: 'alpha' });
    assert.deepEqual(alpha.tasks.map((t) => t.title), ['Apple', 'Zebra']);

    const active = await local.listTasks({ filter: 'active' });
    assert.deepEqual(active.tasks.map((t) => t.title), ['Zebra']);

    const search = await local.listTasks({ q: 'app' });
    assert.deepEqual(search.tasks.map((t) => t.title), ['Apple']);

    // Stats cover every task, not just the filtered ones.
    assert.deepEqual(active.stats, { total: 2, completed: 1, active: 1, overdue: 0, dueToday: 0 });
  });

  it('starts empty when storage is unreadable', async () => {
    installStorage({ failing: true });
    const { tasks, stats } = await local.listTasks();
    assert.deepEqual(tasks, []);
    assert.equal(stats.total, 0);
  });
});

describe('updateTask', () => {
  it('edits a title and preserves the rest', async () => {
    const { task } = await add('Before', { priority: 'high' });
    const { task: updated } = await local.updateTask(task.id, { title: 'After' });
    assert.equal(updated.title, 'After');
    assert.equal(updated.priority, 'high');
    assert.equal(updated.id, task.id);
  });

  it('completes and reopens a task', async () => {
    const { task } = await add('Toggle');

    const { task: done } = await local.updateTask(task.id, { completed: true });
    assert.equal(done.completed, true);
    assert.ok(done.completedAt);

    const { task: reopened } = await local.updateTask(task.id, { completed: false });
    assert.equal(reopened.completed, false);
    assert.equal(reopened.completedAt, null);
  });

  it('rejects an invalid edit and leaves the task untouched', async () => {
    const { task } = await add('Keep me');
    await assert.rejects(() => local.updateTask(task.id, { title: '' }), { status: 400 });

    const { tasks } = await local.listTasks();
    assert.equal(tasks[0].title, 'Keep me');
  });

  it('404s for an unknown id', async () => {
    await assert.rejects(() => local.updateTask('nope', { title: 'x' }), { status: 404 });
  });
});

describe('deleteTask', () => {
  it('removes a task', async () => {
    const { task } = await add('Delete me');
    await local.deleteTask(task.id);
    const { tasks } = await local.listTasks();
    assert.deepEqual(tasks, []);
  });

  it('404s for an unknown id', async () => {
    await assert.rejects(() => local.deleteTask('nope'), { status: 404 });
  });
});

describe('bulk actions', () => {
  it('completes all, then clears completed', async () => {
    await add('one');
    await add('two');

    const completed = await local.completeAll(true);
    assert.ok(completed.tasks.every((task) => task.completed));
    assert.equal(completed.stats.active, 0);

    const cleared = await local.clearCompleted();
    assert.deepEqual(cleared.tasks, []);
    assert.equal(cleared.stats.total, 0);
  });

  it('reopens everything', async () => {
    await add('one');
    await local.completeAll(true);
    const reopened = await local.completeAll(false);
    assert.ok(reopened.tasks.every((task) => !task.completed));
  });
});

describe('persistence', () => {
  it('survives a reload of the same storage', async () => {
    await add('Persisted');
    const { tasks } = await local.listTasks();
    assert.equal(tasks[0].title, 'Persisted');
  });

  it('keeps working when writes fail', async () => {
    installStorage({ failing: true });
    // Storage is unavailable, but the call must still resolve rather than
    // blocking the user from adding a task.
    const { task } = await add('Unsaved but usable');
    assert.equal(task.title, 'Unsaved but usable');
  });
});
