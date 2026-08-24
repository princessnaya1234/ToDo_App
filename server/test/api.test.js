import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.js';
import { createMemoryStore } from '../src/store.js';

let server;
let baseUrl;

/** Small fetch wrapper returning both status and parsed body. */
async function call(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const create = (payload) => call('POST', '/api/tasks', payload);

before(async () => {
  const app = createApp({ store: createMemoryStore() });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const { status, body } = await call('GET', '/api/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
  });
});

describe('POST /api/tasks', () => {
  it('creates a task and returns 201', async () => {
    const { status, body } = await create({ title: 'Write the API', priority: 'high' });
    assert.equal(status, 201);
    assert.equal(body.task.title, 'Write the API');
    assert.equal(body.task.priority, 'high');
    assert.equal(body.task.completed, false);
    assert.ok(body.task.id);
  });

  it('rejects an empty title with field details', async () => {
    const { status, body } = await create({ title: '   ' });
    assert.equal(status, 400);
    assert.equal(body.error.details.title, 'Title is required.');
  });

  it('rejects an invalid priority and due date', async () => {
    const { status, body } = await create({ title: 'x', priority: 'urgent', dueDate: '2026-13-01' });
    assert.equal(status, 400);
    assert.ok(body.error.details.priority);
    assert.ok(body.error.details.dueDate);
  });

  it('rejects a malformed JSON body', async () => {
    const response = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ not json'
    });
    assert.equal(response.status, 400);
  });
});

describe('GET /api/tasks', () => {
  it('lists tasks with whole-list stats', async () => {
    const { status, body } = await call('GET', '/api/tasks');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.tasks));
    assert.equal(body.stats.total, body.tasks.length);
  });

  it('filters, searches and sorts', async () => {
    await create({ title: 'Zebra crossing', priority: 'low' });
    await create({ title: 'Apple pie', priority: 'low' });

    const alpha = await call('GET', '/api/tasks?sort=alpha');
    const titles = alpha.body.tasks.map((task) => task.title);
    assert.deepEqual([...titles].sort((a, b) => a.localeCompare(b)), titles);

    const search = await call('GET', '/api/tasks?q=zebra');
    assert.deepEqual(search.body.tasks.map((task) => task.title), ['Zebra crossing']);

    const active = await call('GET', '/api/tasks?filter=active');
    assert.ok(active.body.tasks.every((task) => !task.completed));
  });

  it('rejects an unknown filter or sort', async () => {
    assert.equal((await call('GET', '/api/tasks?filter=nope')).status, 400);
    assert.equal((await call('GET', '/api/tasks?sort=nope')).status, 400);
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns one task', async () => {
    const { body: created } = await create({ title: 'Fetch me' });
    const { status, body } = await call('GET', `/api/tasks/${created.task.id}`);
    assert.equal(status, 200);
    assert.equal(body.task.id, created.task.id);
  });

  it('404s for an unknown id', async () => {
    const { status, body } = await call('GET', '/api/tasks/does-not-exist');
    assert.equal(status, 404);
    assert.equal(body.error.message, 'Task not found.');
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('edits the title and leaves other fields intact', async () => {
    const { body: created } = await create({ title: 'Before', priority: 'high' });
    const { status, body } = await call('PATCH', `/api/tasks/${created.task.id}`, {
      title: 'After'
    });
    assert.equal(status, 200);
    assert.equal(body.task.title, 'After');
    assert.equal(body.task.priority, 'high');
    assert.equal(body.task.createdAt, created.task.createdAt);
  });

  it('marks a task complete and reopens it', async () => {
    const { body: created } = await create({ title: 'Toggle me' });

    const done = await call('PATCH', `/api/tasks/${created.task.id}`, { completed: true });
    assert.equal(done.body.task.completed, true);
    assert.ok(done.body.task.completedAt);

    const reopened = await call('PATCH', `/api/tasks/${created.task.id}`, { completed: false });
    assert.equal(reopened.body.task.completed, false);
    assert.equal(reopened.body.task.completedAt, null);
  });

  it('updates due date and priority, and clears a due date with null', async () => {
    const { body: created } = await create({ title: 'Dated', dueDate: '2026-03-03' });
    const updated = await call('PATCH', `/api/tasks/${created.task.id}`, {
      dueDate: '2026-04-04',
      priority: 'low'
    });
    assert.equal(updated.body.task.dueDate, '2026-04-04');
    assert.equal(updated.body.task.priority, 'low');

    const cleared = await call('PATCH', `/api/tasks/${created.task.id}`, { dueDate: null });
    assert.equal(cleared.body.task.dueDate, null);
  });

  it('rejects an invalid edit', async () => {
    const { body: created } = await create({ title: 'Keep me' });
    const { status, body } = await call('PATCH', `/api/tasks/${created.task.id}`, { title: '' });
    assert.equal(status, 400);
    assert.ok(body.error.details.title);

    const unchanged = await call('GET', `/api/tasks/${created.task.id}`);
    assert.equal(unchanged.body.task.title, 'Keep me');
  });

  it('404s for an unknown id', async () => {
    assert.equal((await call('PATCH', '/api/tasks/nope', { title: 'x' })).status, 404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes a task and 404s afterwards', async () => {
    const { body: created } = await create({ title: 'Delete me' });
    assert.equal((await call('DELETE', `/api/tasks/${created.task.id}`)).status, 204);
    assert.equal((await call('GET', `/api/tasks/${created.task.id}`)).status, 404);
  });

  it('404s for an unknown id', async () => {
    assert.equal((await call('DELETE', '/api/tasks/nope')).status, 404);
  });
});

describe('bulk routes', () => {
  it('completes all, then clears completed', async () => {
    const completeAll = await call('POST', '/api/tasks/complete-all', { completed: true });
    assert.equal(completeAll.status, 200);
    assert.ok(completeAll.body.tasks.every((task) => task.completed));
    assert.equal(completeAll.body.stats.active, 0);

    const cleared = await call('POST', '/api/tasks/clear-completed');
    assert.equal(cleared.status, 200);
    assert.deepEqual(cleared.body.tasks, []);
    assert.equal(cleared.body.stats.total, 0);
  });

  it('rejects complete-all without a boolean', async () => {
    assert.equal((await call('POST', '/api/tasks/complete-all', { completed: 'yes' })).status, 400);
  });
});

describe('unknown routes', () => {
  it('404s with a JSON error', async () => {
    const { status, body } = await call('GET', '/api/nothing-here');
    assert.equal(status, 404);
    assert.ok(body.error.message);
  });
});
