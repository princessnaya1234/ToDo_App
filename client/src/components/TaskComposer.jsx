import { useState } from 'react';

const EMPTY = { title: '', priority: 'normal', dueDate: '' };

/** The "add a task" form at the top of the list. */
export default function TaskComposer({ onAdd }) {
  const [draft, setDraft] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (event) => setDraft((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!draft.title.trim() || submitting) return;

    setSubmitting(true);
    const added = await onAdd({
      title: draft.title,
      priority: draft.priority,
      dueDate: draft.dueDate || null
    });
    setSubmitting(false);
    if (added) setDraft(EMPTY);
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <input
        className="composer__title"
        type="text"
        value={draft.title}
        onChange={set('title')}
        placeholder="What needs doing?"
        aria-label="Task title"
        maxLength={200}
        autoFocus
      />
      <div className="composer__row">
        <label className="field">
          <span>Priority</span>
          <select value={draft.priority} onChange={set('priority')}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="field">
          <span>Due date</span>
          <input type="date" value={draft.dueDate} onChange={set('dueDate')} />
        </label>
        <button
          type="submit"
          className="button button--primary"
          disabled={!draft.title.trim() || submitting}
        >
          {submitting ? 'Adding…' : 'Add task'}
        </button>
      </div>
    </form>
  );
}
