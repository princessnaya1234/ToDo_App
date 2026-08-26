/**
 * REST API for tasks.
 *
 *   GET    /api/health
 *   GET    /api/tasks?filter=all|active|completed&q=…&sort=created|due|priority|alpha
 *   POST   /api/tasks
 *   GET    /api/tasks/:id
 *   PATCH  /api/tasks/:id
 *   DELETE /api/tasks/:id
 *   POST   /api/tasks/complete-all   { completed: boolean }
 *   POST   /api/tasks/clear-completed
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import express from 'express';
import cors from 'cors';

import {
  FILTERS,
  SORTS,
  completeAll,
  queryTasks,
  stats,
  validateNewTask,
  validateTaskUpdate
} from 'todo-shared/model.js';

const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next);

function fail(res, status, message, details) {
  return res.status(status).json({ error: { message, ...(details ? { details } : {}) } });
}

export function createApp({ store, clientDir = null }) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '64kb' }));

  const api = express.Router();

  api.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  api.get(
    '/tasks',
    asyncRoute(async (req, res) => {
      const filter = req.query.filter ?? 'all';
      const sort = req.query.sort ?? 'created';
      if (!FILTERS.includes(filter)) {
        return fail(res, 400, `Unknown filter. Use one of: ${FILTERS.join(', ')}.`);
      }
      if (!SORTS.includes(sort)) {
        return fail(res, 400, `Unknown sort. Use one of: ${SORTS.join(', ')}.`);
      }

      const tasks = await store.all();
      // Stats always describe the whole list, not the filtered view, so the UI
      // can show "3 of 10 remaining" while looking at a filtered page.
      res.json({ tasks: queryTasks(tasks, { filter, q: req.query.q, sort }), stats: stats(tasks) });
    })
  );

  api.post(
    '/tasks',
    asyncRoute(async (req, res) => {
      const { task, errors } = validateNewTask(req.body ?? {});
      if (errors) return fail(res, 400, 'The task could not be created.', errors);
      await store.add(task);
      res.status(201).json({ task });
    })
  );

  api.get(
    '/tasks/:id',
    asyncRoute(async (req, res) => {
      const task = await store.find(req.params.id);
      if (!task) return fail(res, 404, 'Task not found.');
      res.json({ task });
    })
  );

  api.patch(
    '/tasks/:id',
    asyncRoute(async (req, res) => {
      const existing = await store.find(req.params.id);
      if (!existing) return fail(res, 404, 'Task not found.');

      const { task, errors } = validateTaskUpdate(existing, req.body ?? {});
      if (errors) return fail(res, 400, 'The task could not be updated.', errors);

      await store.update(existing.id, task);
      res.json({ task });
    })
  );

  api.delete(
    '/tasks/:id',
    asyncRoute(async (req, res) => {
      const removed = await store.remove(req.params.id);
      if (!removed) return fail(res, 404, 'Task not found.');
      res.status(204).end();
    })
  );

  api.post(
    '/tasks/complete-all',
    asyncRoute(async (req, res) => {
      const { completed } = req.body ?? {};
      if (typeof completed !== 'boolean') {
        return fail(res, 400, 'Body must include "completed" as true or false.');
      }
      const tasks = await store.replaceAll(completeAll(await store.all(), completed));
      res.json({ tasks, stats: stats(tasks) });
    })
  );

  api.post(
    '/tasks/clear-completed',
    asyncRoute(async (req, res) => {
      const remaining = (await store.all()).filter((task) => !task.completed);
      const tasks = await store.replaceAll(remaining);
      res.json({ tasks, stats: stats(tasks) });
    })
  );

  app.use('/api', api);

  app.use('/api', (req, res) => fail(res, 404, `No API route for ${req.method} ${req.originalUrl}.`));

  // In production the built React app is served from this same server, so the
  // whole thing is one deployable service on one URL.
  if (clientDir && existsSync(join(clientDir, 'index.html'))) {
    app.use(express.static(clientDir));
    // Any non-API path falls through to index.html so client-side routing works.
    app.get(/.*/, (req, res) => res.sendFile(join(clientDir, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return fail(res, 400, 'Request body is not valid JSON.');
    if (error.type === 'entity.too.large') return fail(res, 413, 'Request body is too large.');
    console.error('[api]', error);
    fail(res, 500, 'Something went wrong handling the request.');
  });

  return app;
}
