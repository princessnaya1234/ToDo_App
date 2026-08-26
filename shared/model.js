/**
 * Pure task logic: validation, mutation and querying over plain data.
 *
 * No Express, no filesystem, no DOM — which is what lets the API server and the
 * browser-only build enforce identical rules instead of drifting apart.
 */

/**
 * Web Crypto is available in browsers (on https and localhost) and in Node 19+,
 * so the same id generator works on both sides. The fallback covers older or
 * insecure contexts where randomUUID is missing.
 */
function randomUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const PRIORITIES = ['low', 'normal', 'high'];
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

export const FILTERS = ['all', 'active', 'completed'];
export const SORTS = ['created', 'due', 'priority', 'alpha'];

const MAX_TITLE = 200;
const MAX_NOTES = 2000;

/** Collapse user input into a stored title, or null when it is effectively empty. */
export function normaliseTitle(raw) {
  const title = String(raw ?? '').trim().replace(/\s+/g, ' ');
  return title.length ? title.slice(0, MAX_TITLE) : null;
}

/** A due date is stored as a plain `YYYY-MM-DD` string, or null. */
export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Validate a create payload. Returns `{ task }` on success or `{ errors }` with
 * one message per bad field, so the API can answer 400 with everything at once.
 */
export function validateNewTask(payload = {}) {
  const errors = {};
  const title = normaliseTitle(payload.title);
  if (!title) errors.title = 'Title is required.';

  const priority = payload.priority ?? 'normal';
  if (!PRIORITIES.includes(priority)) {
    errors.priority = `Priority must be one of: ${PRIORITIES.join(', ')}.`;
  }

  const dueDate = payload.dueDate ?? null;
  if (dueDate !== null && !isValidDate(dueDate)) {
    errors.dueDate = 'Due date must be a YYYY-MM-DD calendar date, or null.';
  }

  const notes = String(payload.notes ?? '');
  if (notes.length > MAX_NOTES) errors.notes = `Notes must be ${MAX_NOTES} characters or fewer.`;

  if (Object.keys(errors).length) return { errors };

  const now = new Date().toISOString();
  return {
    task: {
      id: randomUUID(),
      title,
      notes: notes.trim(),
      completed: Boolean(payload.completed),
      priority,
      dueDate,
      createdAt: now,
      updatedAt: now,
      completedAt: payload.completed ? now : null
    }
  };
}

/**
 * Validate a partial update against an existing task. Absent fields are left
 * alone; an explicit `null` due date clears it.
 */
export function validateTaskUpdate(task, changes = {}) {
  const errors = {};
  const next = { ...task };

  if ('title' in changes) {
    const title = normaliseTitle(changes.title);
    if (!title) errors.title = 'Title cannot be empty.';
    else next.title = title;
  }

  if ('notes' in changes) {
    const notes = String(changes.notes ?? '');
    if (notes.length > MAX_NOTES) errors.notes = `Notes must be ${MAX_NOTES} characters or fewer.`;
    else next.notes = notes.trim();
  }

  if ('priority' in changes) {
    if (!PRIORITIES.includes(changes.priority)) {
      errors.priority = `Priority must be one of: ${PRIORITIES.join(', ')}.`;
    } else {
      next.priority = changes.priority;
    }
  }

  if ('dueDate' in changes) {
    if (changes.dueDate === null || changes.dueDate === '') next.dueDate = null;
    else if (!isValidDate(changes.dueDate)) {
      errors.dueDate = 'Due date must be a YYYY-MM-DD calendar date, or null.';
    } else {
      next.dueDate = changes.dueDate;
    }
  }

  if ('completed' in changes) {
    if (typeof changes.completed !== 'boolean') {
      errors.completed = 'Completed must be true or false.';
    } else {
      next.completed = changes.completed;
      // Keep the original completion time when a completed task is edited again.
      next.completedAt = changes.completed ? (task.completedAt ?? new Date().toISOString()) : null;
    }
  }

  if (Object.keys(errors).length) return { errors };
  return { task: { ...next, updatedAt: new Date().toISOString() } };
}

export function completeAll(tasks, completed) {
  const stamp = new Date().toISOString();
  return tasks.map((task) =>
    task.completed === completed
      ? task
      : { ...task, completed, completedAt: completed ? stamp : null, updatedAt: stamp }
  );
}

export function filterTasks(tasks, filter) {
  if (filter === 'active') return tasks.filter((task) => !task.completed);
  if (filter === 'completed') return tasks.filter((task) => task.completed);
  return tasks;
}

export function searchTasks(tasks, query) {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return tasks;
  return tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(needle) || task.notes.toLowerCase().includes(needle)
  );
}

export function sortTasks(tasks, sort) {
  const sorted = [...tasks];
  switch (sort) {
    case 'due':
      // Undated tasks sort last rather than first.
      return sorted.sort((a, b) => {
        if (a.dueDate === b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate < b.dueDate ? -1 : 1;
      });
    case 'priority':
      return sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    case 'alpha':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sorted;
  }
}

/** The read pipeline behind `GET /api/tasks`. */
export function queryTasks(tasks, { filter = 'all', q = '', sort = 'created' } = {}) {
  return sortTasks(searchTasks(filterTasks(tasks, filter), q), sort);
}

export function stats(tasks, today = new Date().toISOString().slice(0, 10)) {
  const completed = tasks.filter((task) => task.completed).length;
  return {
    total: tasks.length,
    completed,
    active: tasks.length - completed,
    overdue: tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < today).length,
    dueToday: tasks.filter((task) => !task.completed && task.dueDate === today).length
  };
}

/** Coerce whatever is on disk back into well-formed tasks, dropping the unusable. */
export function sanitiseTasks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const title = normaliseTitle(raw.title);
      if (!title) return null;
      const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
      return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : randomUUID(),
        title,
        notes: typeof raw.notes === 'string' ? raw.notes.slice(0, MAX_NOTES) : '',
        completed: Boolean(raw.completed),
        priority: PRIORITIES.includes(raw.priority) ? raw.priority : 'normal',
        dueDate: isValidDate(raw.dueDate) ? raw.dueDate : null,
        createdAt,
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt,
        completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null
      };
    })
    .filter(Boolean);
}
