/**
 * JSON-file task repository.
 *
 * Writes go through a promise chain so concurrent requests cannot interleave,
 * and each write lands via a temp file + rename so a crash mid-write leaves the
 * previous file intact rather than a truncated one.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { sanitiseTasks } from 'todo-shared/model.js';

export function createStore(filePath) {
  let cache = null;
  let writeQueue = Promise.resolve();

  async function load() {
    if (cache) return cache;
    try {
      cache = sanitiseTasks(JSON.parse(await readFile(filePath, 'utf8')));
    } catch (error) {
      // A missing file is the normal first-run case; unreadable or corrupt data
      // starts empty rather than taking the server down.
      if (error.code !== 'ENOENT') {
        console.warn(`[store] could not read ${filePath}: ${error.message}`);
      }
      cache = [];
    }
    return cache;
  }

  function persist(tasks) {
    writeQueue = writeQueue.then(async () => {
      await mkdir(dirname(filePath), { recursive: true });
      const temp = `${filePath}.${process.pid}.tmp`;
      await writeFile(temp, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
      await rename(temp, filePath);
    });
    return writeQueue;
  }

  return {
    async all() {
      return [...(await load())];
    },

    async find(id) {
      return (await load()).find((task) => task.id === id) ?? null;
    },

    async replaceAll(tasks) {
      cache = [...tasks];
      await persist(cache);
      return [...cache];
    },

    async add(task) {
      const tasks = await load();
      cache = [...tasks, task];
      await persist(cache);
      return task;
    },

    async update(id, task) {
      const tasks = await load();
      const index = tasks.findIndex((current) => current.id === id);
      if (index === -1) return null;
      cache = tasks.map((current, i) => (i === index ? task : current));
      await persist(cache);
      return task;
    },

    async remove(id) {
      const tasks = await load();
      const next = tasks.filter((task) => task.id !== id);
      if (next.length === tasks.length) return false;
      cache = next;
      await persist(cache);
      return true;
    }
  };
}

/** In-memory store with the same interface, used by the API tests. */
export function createMemoryStore(initial = []) {
  let tasks = [...initial];
  return {
    async all() {
      return [...tasks];
    },
    async find(id) {
      return tasks.find((task) => task.id === id) ?? null;
    },
    async replaceAll(next) {
      tasks = [...next];
      return [...tasks];
    },
    async add(task) {
      tasks = [...tasks, task];
      return task;
    },
    async update(id, task) {
      const index = tasks.findIndex((current) => current.id === id);
      if (index === -1) return null;
      tasks = tasks.map((current, i) => (i === index ? task : current));
      return task;
    },
    async remove(id) {
      const next = tasks.filter((task) => task.id !== id);
      if (next.length === tasks.length) return false;
      tasks = next;
      return true;
    }
  };
}
