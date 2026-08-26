/**
 * Backend selector.
 *
 * The app ships in two forms and this is the only place that knows which:
 *
 *   - default: talks to the Express API over HTTP.
 *   - standalone (VITE_STANDALONE=true): keeps tasks in the browser, so the app
 *     can be published as a static site with no server behind it.
 *
 * Both modules export the same functions with the same shapes, so nothing else
 * in the app changes between builds.
 */
import * as http from './backends/http.js';
import * as local from './backends/local.js';

export const STANDALONE = import.meta.env.VITE_STANDALONE === 'true';

const backend = STANDALONE ? local : http;

export { ApiError } from './backends/errors.js';

export const listTasks = (options) => backend.listTasks(options);
export const createTask = (task) => backend.createTask(task);
export const updateTask = (id, changes) => backend.updateTask(id, changes);
export const deleteTask = (id) => backend.deleteTask(id);
export const completeAll = (completed) => backend.completeAll(completed);
export const clearCompleted = () => backend.clearCompleted();
