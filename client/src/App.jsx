import { useEffect, useMemo, useRef, useState } from 'react';
import { toISODate } from 'todo-shared/model.js';

import EmptyState from './components/EmptyState.jsx';
import QuickAdd from './components/QuickAdd.jsx';
import Sidebar from './components/Sidebar.jsx';
import TaskItem from './components/TaskItem.jsx';
import { STANDALONE } from './api.js';
import { useDebounced } from './hooks/useDebounced.js';
import { useTasks } from './hooks/useTasks.js';
import { countsByView, groupTasks, tasksForView, VIEWS } from './lib/grouping.js';

const THEME_KEY = 'todo-app.theme';

function storedTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY) ?? 'light';
  } catch {
    return 'light';
  }
}

const LONG_DATE = { weekday: 'long', day: 'numeric', month: 'long' };

export default function App() {
  const [view, setView] = useState('today');
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState(storedTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const searchRef = useRef(null);

  const query = useDebounced(search, 200);
  const today = toISODate(new Date());

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
    clearCompleted,
    dismissError
  } = useTasks({ query });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage may be unavailable; the theme still applies for this visit.
    }
  }, [theme]);

  useEffect(() => {
    const onKey = (event) => {
      const typing = /^(input|textarea|select)$/i.test(event.target.tagName);
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape' && typing && event.target === searchRef.current) {
        setSearch('');
        searchRef.current?.blur();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const counts = useMemo(() => countsByView(tasks, today), [tasks, today]);
  const visible = useMemo(() => tasksForView(tasks, view, today), [tasks, view, today]);
  const groups = useMemo(() => groupTasks(visible, today), [visible, today]);

  // Clearing the last task in a view deserves a moment of acknowledgement.
  const previousCount = useRef(visible.length);
  useEffect(() => {
    const emptiedByFinishing = previousCount.current > 0 && visible.length === 0 && !loading;
    previousCount.current = visible.length;
    if (!emptiedByFinishing || view === 'completed' || search) return;

    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), 2200);
    return () => clearTimeout(timer);
  }, [visible.length, loading, view, search]);

  const heading = VIEWS[view];
  let position = 0;

  return (
    <div className="shell">
      <Sidebar
        view={view}
        counts={counts}
        stats={stats}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onViewChange={(next) => {
          setView(next);
          setMenuOpen(false);
        }}
      />

      <main className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn topbar__menu"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M3 6h14M3 10h14M3 14h14" />
            </svg>
          </button>

          <div className="topbar__title">
            <h1>{heading.label}</h1>
            <p>
              {new Date().toLocaleDateString(undefined, LONG_DATE)}
              {stats.overdue > 0 && view !== 'completed' && (
                <span className="topbar__alert"> · {stats.overdue} overdue</span>
              )}
            </p>
          </div>

          <div className="topbar__tools">
            <div className="search">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <circle cx="9" cy="9" r="5.5" />
                <path d="M13.5 13.5L17 17" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                aria-label="Search tasks"
              />
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="10" cy="10" r="3.6" />
                  <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                  <path d="M16 11.6A6.6 6.6 0 018.4 4a6.8 6.8 0 103.9 12.3 6.8 6.8 0 003.7-4.7z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <div className="content">
          <QuickAdd
            onAdd={addTask}
            // Adding while looking at Today should put it in Today.
            defaultDueDate={view === 'today' ? today : null}
          />

          {error && (
            <div className="alert" role="alert">
              <span>{error.message}</span>
              <button type="button" className="icon-btn" onClick={dismissError} aria-label="Dismiss">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
                </svg>
              </button>
            </div>
          )}

          {loading ? (
            <ul className="tasks" aria-hidden="true">
              {[0, 1, 2, 3].map((row) => (
                <li key={row} className="skeleton" style={{ '--stagger': `${row * 60}ms` }} />
              ))}
            </ul>
          ) : groups.length === 0 ? (
            <>
              {celebrating && <Celebration />}
              <EmptyState view={view} searching={Boolean(search.trim())} />
            </>
          ) : (
            groups.map((group) => (
              <section key={group.key} className="group">
                <h2 className={`group__head group__head--${group.tone}`}>
                  {group.label}
                  <span className="group__count">{group.tasks.length}</span>
                </h2>
                <ul className="tasks">
                  {group.tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      index={position++}
                      busy={busyIds.has(task.id)}
                      onToggle={toggleTask}
                      onEdit={editTask}
                      onDelete={removeTask}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}

          {view === 'completed' && stats.completed > 0 && (
            <div className="content__footer">
              <button type="button" className="btn btn--ghost" onClick={clearCompleted}>
                Clear {stats.completed} completed
              </button>
            </div>
          )}

          <p className="tips">
            <kbd>N</kbd> new task · <kbd>/</kbd> search · double-click to edit
            {STANDALONE && ' · saved in this browser'}
          </p>
        </div>
      </main>
    </div>
  );
}

/** Brief burst when a view is cleared. Purely decorative. */
function Celebration() {
  const pieces = Array.from({ length: 14 }, (_, index) => index);
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece}
          className="confetti__bit"
          style={{
            '--x': `${(piece / 13) * 100}%`,
            '--delay': `${piece * 45}ms`,
            '--hue': `${(piece * 37) % 360}`
          }}
        />
      ))}
    </div>
  );
}
