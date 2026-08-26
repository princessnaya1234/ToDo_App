/**
 * Thin client for the task API. Every helper resolves to parsed JSON or throws
 * an ApiError carrying the server's message and per-field details.
 */
import { ApiError } from './errors.js';

const BASE = '/api';

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError('Could not reach the server. Is the API running?');
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError('The server sent a response we could not read.', {
      status: response.status
    });
  }

  if (!response.ok) {
    throw new ApiError(payload?.error?.message ?? `Request failed (${response.status}).`, {
      status: response.status,
      details: payload?.error?.details
    });
  }

  return payload;
}

const query = ({ filter, q, sort }) => {
  const params = new URLSearchParams();
  if (filter && filter !== 'all') params.set('filter', filter);
  if (q?.trim()) params.set('q', q.trim());
  if (sort && sort !== 'created') params.set('sort', sort);
  const string = params.toString();
  return string ? `?${string}` : '';
};

export const listTasks = (options = {}) => request(`/tasks${query(options)}`);
export const createTask = (task) => request('/tasks', { method: 'POST', body: task });
export const updateTask = (id, changes) =>
  request(`/tasks/${id}`, { method: 'PATCH', body: changes });
export const deleteTask = (id) => request(`/tasks/${id}`, { method: 'DELETE' });
export const completeAll = (completed) =>
  request('/tasks/complete-all', { method: 'POST', body: { completed } });
export const clearCompleted = () => request('/tasks/clear-completed', { method: 'POST' });
