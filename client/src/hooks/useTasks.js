import { useCallback, useEffect, useRef, useState } from 'react';

import * as api from '../api.js';

const EMPTY_STATS = { total: 0, completed: 0, active: 0, overdue: 0, dueToday: 0 };

/**
 * Owns all task state and every call to the API.
 *
 * The server is the source of truth: mutations post and then reload the list,
 * except for the completion toggle, which updates locally first so the checkbox
 * responds instantly and rolls back if the request fails.
 */
export function useTasks({ filter, query, sort }) {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyIds, setBusyIds] = useState(() => new Set());

  // Guards against an earlier, slower request overwriting a newer response.
  const requestId = useRef(0);

  const refresh = useCallback(
    async ({ quiet = false } = {}) => {
      const id = ++requestId.current;
      if (!quiet) setLoading(true);
      try {
        const data = await api.listTasks({ filter, q: query, sort });
        if (id !== requestId.current) return;
        setTasks(data.tasks);
        setStats(data.stats);
        setError(null);
      } catch (err) {
        if (id === requestId.current) setError(err);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [filter, query, sort]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const withBusy = useCallback(async (id, work) => {
    setBusyIds((current) => new Set(current).add(id));
    try {
      return await work();
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }, []);

  /** Run a mutation, refresh on success, and surface the error on failure. */
  const run = useCallback(
    async (work) => {
      try {
        await work();
        setError(null);
        await refresh({ quiet: true });
        return true;
      } catch (err) {
        setError(err);
        return false;
      }
    },
    [refresh]
  );

  const addTask = useCallback((task) => run(() => api.createTask(task)), [run]);

  const editTask = useCallback(
    (id, changes) => withBusy(id, () => run(() => api.updateTask(id, changes))),
    [run, withBusy]
  );

  const removeTask = useCallback(
    (id) => withBusy(id, () => run(() => api.deleteTask(id))),
    [run, withBusy]
  );

  const toggleTask = useCallback(
    async (id, completed) => {
      const snapshot = tasks;
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, completed } : task))
      );
      const ok = await withBusy(id, () => run(() => api.updateTask(id, { completed })));
      if (!ok) setTasks(snapshot);
      return ok;
    },
    [run, tasks, withBusy]
  );

  const completeAll = useCallback((completed) => run(() => api.completeAll(completed)), [run]);
  const clearCompleted = useCallback(() => run(() => api.clearCompleted()), [run]);

  return {
    tasks,
    stats,
    loading,
    error,
    busyIds,
    addTask,
    editTask,
    removeTask,
    toggleTask,
    completeAll,
    clearCompleted,
    refresh,
    dismissError: () => setError(null)
  };
}
