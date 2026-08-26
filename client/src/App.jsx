import { useEffect, useState } from 'react';

import StatsBar from './components/StatsBar.jsx';
import TaskComposer from './components/TaskComposer.jsx';
import TaskList from './components/TaskList.jsx';
import Toolbar from './components/Toolbar.jsx';
import { STANDALONE } from './api.js';
import { useTasks } from './hooks/useTasks.js';
import { useDebounced } from './hooks/useDebounced.js';

const THEME_KEY = 'todo-app.theme';

function initialTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY) ?? 'system';
  } catch {
    return 'system';
  }
}

export default function App() {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('created');
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState(initialTheme);

  // Typing shouldn't fire a request per keystroke.
  const debouncedSearch = useDebounced(search, 250);

  const {
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
    dismissError
  } = useTasks({ filter, query: debouncedSearch, sort });

  useEffect(() => {
    const resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    document.documentElement.dataset.theme = resolved;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies.
    }
  }, [theme]);

  return (
    <div className="page">
      <main className="card">
        <header className="header">
          <div>
            <h1>ToDo List</h1>
            <p className="header__subtitle">Everything you are working on, in one place.</p>
          </div>
          <button
            type="button"
            className="icon-button icon-button--large"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </header>

        <StatsBar stats={stats} />

        <TaskComposer onAdd={addTask} />

        {error && (
          <div className="alert" role="alert">
            <span>{error.message}</span>
            <button type="button" className="icon-button" onClick={dismissError} aria-label="Dismiss">
              ✕
            </button>
          </div>
        )}

        <Toolbar
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
        />

        <TaskList
          tasks={tasks}
          loading={loading}
          busyIds={busyIds}
          filter={filter}
          search={search}
          onToggle={toggleTask}
          onEdit={editTask}
          onDelete={removeTask}
        />

        <footer className="footer">
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => completeAll(stats.active > 0)}
            disabled={stats.total === 0}
          >
            {stats.active > 0 ? 'Complete all' : 'Reopen all'}
          </button>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={clearCompleted}
            disabled={stats.completed === 0}
          >
            Clear completed
          </button>
        </footer>

        <p className="hint">
          Double-click a task to edit it.
          {STANDALONE && ' Your tasks are saved in this browser, and are visible only to you.'}
        </p>
      </main>
    </div>
  );
}
