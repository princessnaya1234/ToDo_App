/**
 * Browser-only backend.
 *
 * Stands in for the REST API when the app is published as a static site (GitHub
 * Pages), where no server exists. It fulfils exactly the same contract as
 * `http.js` — same function names, same shapes, same errors — using the shared
 * task rules and localStorage, so `useTasks` cannot tell the difference.
 *
 * Tasks stay in the visitor's own browser: private to them, and never sent
 * anywhere.
 */
import {
  completeAll as completeAllTasks,
  queryTasks,
  sanitiseTasks,
  stats,
  validateNewTask,
  validateTaskUpdate
} from 'todo-shared/model.js';

import { ApiError } from './errors.js';

const STORAGE_KEY = 'todo-app.tasks.v1';

/** Reads never throw: private mode and blocked site data fall back to empty. */
function read() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return sanitiseTasks(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function write(tasks) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Out of quota, or storage disabled. The change still applies for this
    // session; surfacing an error here would block work the user can still do.
  }
  return tasks;
}

function findOr404(tasks, id) {
  const task = tasks.find((current) => current.id === id);
  if (!task) throw new ApiError('Task not found.', { status: 404 });
  return task;
}

export async function listTasks({ filter = 'all', q = '', sort = 'created' } = {}) {
  const tasks = read();
  // Stats describe the whole list, not the filtered view — same as the API.
  return { tasks: queryTasks(tasks, { filter, q, sort }), stats: stats(tasks) };
}

export async function createTask(payload) {
  const { task, errors } = validateNewTask(payload ?? {});
  if (errors) {
    throw new ApiError('The task could not be created.', { status: 400, details: errors });
  }
  write([...read(), task]);
  return { task };
}

export async function updateTask(id, changes) {
  const tasks = read();
  const existing = findOr404(tasks, id);

  const { task, errors } = validateTaskUpdate(existing, changes ?? {});
  if (errors) {
    throw new ApiError('The task could not be updated.', { status: 400, details: errors });
  }

  write(tasks.map((current) => (current.id === id ? task : current)));
  return { task };
}

export async function deleteTask(id) {
  const tasks = read();
  findOr404(tasks, id);
  write(tasks.filter((task) => task.id !== id));
  return null;
}

export async function completeAll(completed) {
  const tasks = write(completeAllTasks(read(), completed));
  return { tasks, stats: stats(tasks) };
}

export async function clearCompleted() {
  const tasks = write(read().filter((task) => !task.completed));
  return { tasks, stats: stats(tasks) };
}
