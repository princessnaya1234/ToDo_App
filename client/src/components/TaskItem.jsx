import { useEffect, useRef, useState } from 'react';

import { describeDueDate, isOverdue } from '../lib/dates.js';

/**
 * One task row. Editing happens in place: double-click the title (or press the
 * edit button), then Enter to save and Escape to cancel.
 */
export default function TaskItem({ task, busy, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing() {
    setDraft(task);
    setEditing(true);
  }

  async function save() {
    const title = draft.title.trim();
    if (!title) {
      setEditing(false);
      return;
    }

    const changes = {};
    if (title !== task.title) changes.title = title;
    if (draft.priority !== task.priority) changes.priority = draft.priority;
    if ((draft.dueDate ?? null) !== task.dueDate) changes.dueDate = draft.dueDate || null;

    setEditing(false);
    if (Object.keys(changes).length) await onEdit(task.id, changes);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') save();
    if (event.key === 'Escape') setEditing(false);
  }

  const overdue = isOverdue(task);

  return (
    <li className={`task${task.completed ? ' task--done' : ''}${busy ? ' task--busy' : ''}`}>
      <input
        type="checkbox"
        className="task__checkbox"
        checked={task.completed}
        onChange={(event) => onToggle(task.id, event.target.checked)}
        aria-label={`Mark "${task.title}" ${task.completed ? 'active' : 'complete'}`}
      />

      {editing ? (
        <div className="task__editor">
          <input
            ref={inputRef}
            type="text"
            className="input"
            value={draft.title}
            maxLength={200}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            onKeyDown={handleKeyDown}
            aria-label="Edit task title"
          />
          <div className="task__editor-row">
            <select
              className="input"
              value={draft.priority}
              onChange={(event) => setDraft({ ...draft, priority: event.target.value })}
              aria-label="Edit priority"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              className="input"
              value={draft.dueDate ?? ''}
              onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
              aria-label="Edit due date"
            />
            <button type="button" className="button button--primary button--small" onClick={save}>
              Save
            </button>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="task__body" onDoubleClick={startEditing}>
          <span className="task__title">{task.title}</span>
          <div className="task__meta">
            <span className={`badge badge--${task.priority}`}>{task.priority}</span>
            {task.dueDate && (
              <span className={`badge badge--due${overdue ? ' badge--overdue' : ''}`}>
                {describeDueDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>
      )}

      {!editing && (
        <div className="task__actions">
          <button
            type="button"
            className="icon-button"
            onClick={startEditing}
            aria-label={`Edit "${task.title}"`}
            title="Edit"
          >
            ✎
          </button>
          <button
            type="button"
            className="icon-button icon-button--danger"
            onClick={() => onDelete(task.id)}
            disabled={busy}
            aria-label={`Delete "${task.title}"`}
            title="Delete"
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}
