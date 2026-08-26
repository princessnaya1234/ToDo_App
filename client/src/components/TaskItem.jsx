import { useEffect, useRef, useState } from 'react';

import { describeDueDate, isOverdue } from '../lib/dates.js';

const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' }
];

/**
 * A task row. Actions stay hidden until hover or keyboard focus so a long list
 * reads as text rather than a wall of buttons; double-click opens the editor.
 */
export default function TaskItem({ task, busy, index, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  function startEditing() {
    setDraft(task);
    setEditing(true);
  }

  async function save() {
    const title = draft.title.trim();
    if (!title) return setEditing(false);

    const changes = {};
    if (title !== task.title) changes.title = title;
    if (draft.priority !== task.priority) changes.priority = draft.priority;
    if ((draft.dueDate ?? null) !== task.dueDate) changes.dueDate = draft.dueDate || null;

    setEditing(false);
    if (Object.keys(changes).length) await onEdit(task.id, changes);
  }

  if (editing) {
    return (
      <li className="task task--editing">
        <div className="task__editor">
          <input
            ref={inputRef}
            className="field-input"
            value={draft.title}
            maxLength={200}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save();
              if (event.key === 'Escape') setEditing(false);
            }}
            aria-label="Task title"
          />
          <div className="task__editor-row">
            <select
              className="field-input field-input--compact"
              value={draft.priority}
              onChange={(event) => setDraft({ ...draft, priority: event.target.value })}
              aria-label="Priority"
            >
              {PRIORITIES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="field-input field-input--compact"
              value={draft.dueDate ?? ''}
              onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
              aria-label="Due date"
            />
            <div className="task__editor-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary" onClick={save}>
                Save
              </button>
            </div>
          </div>
        </div>
      </li>
    );
  }

  const overdue = isOverdue(task);

  return (
    <li
      className={`task task--${task.priority}${task.completed ? ' task--done' : ''}${busy ? ' task--busy' : ''}`}
      // Staggering the entrance makes the list assemble instead of appearing.
      style={{ '--stagger': `${Math.min(index, 12) * 28}ms` }}
      onDoubleClick={startEditing}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        className="check"
        onClick={() => onToggle(task.id, !task.completed)}
        aria-label={`Mark "${task.title}" ${task.completed ? 'not done' : 'done'}`}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M5.5 10.5l3 3 6-7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="task__main">
        <span className="task__title">{task.title}</span>
        {(task.dueDate || task.priority !== 'normal') && (
          <span className="task__meta">
            {task.dueDate && (
              <span className={`meta-chip${overdue ? ' meta-chip--overdue' : ''}`}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="2" y="3.5" width="12" height="11" rx="2" />
                  <path d="M2 7h12M5.5 1.75v2.5M10.5 1.75v2.5" strokeLinecap="round" />
                </svg>
                {describeDueDate(task.dueDate)}
              </span>
            )}
            {task.priority !== 'normal' && (
              <span className={`meta-chip meta-chip--${task.priority}`}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M4 14V2.75h8l-1.75 3L12 8.75H4" strokeLinejoin="round" />
                </svg>
                {task.priority === 'high' ? 'High' : 'Low'}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="task__actions">
        <button type="button" className="icon-btn" onClick={startEditing} aria-label={`Edit "${task.title}"`}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13.5 3.5l3 3L7 16H4v-3z" />
          </svg>
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          onClick={() => onDelete(task.id)}
          disabled={busy}
          aria-label={`Delete "${task.title}"`}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h12M8 6V4h4v2M6.5 6l.6 10h5.8l.6-10" />
          </svg>
        </button>
      </div>
    </li>
  );
}
