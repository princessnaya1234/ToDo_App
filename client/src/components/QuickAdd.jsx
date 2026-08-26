import { useEffect, useRef, useState } from 'react';
import { parseQuickAdd } from 'todo-shared/model.js';

import { describeDueDate } from '../lib/dates.js';

const PRIORITY_LABEL = { high: 'High', normal: 'Normal', low: 'Low' };

/**
 * One-line task entry that reads dates and priority as you type: "Pay rent
 * friday p1". A live preview shows what was understood before you commit.
 *
 * `defaultDueDate` is the date to use when none is typed, so a task added while
 * looking at Today lands in Today instead of vanishing into the undated pile.
 */
export default function QuickAdd({ onAdd, defaultDueDate = null }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  // Parse on every keystroke: it is a pure function over a short string.
  const parsed = parseQuickAdd(text);
  const effectiveDueDate = parsed.dueDate ?? (text.trim() ? defaultDueDate : null);

  useEffect(() => {
    const focusOnKey = (event) => {
      const typing = /^(input|textarea|select)$/i.test(event.target.tagName);
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', focusOnKey);
    return () => document.removeEventListener('keydown', focusOnKey);
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!parsed.title || submitting) return;

    setSubmitting(true);
    const added = await onAdd({
      title: parsed.title,
      priority: parsed.priority ?? 'normal',
      dueDate: parsed.dueDate ?? defaultDueDate
    });
    setSubmitting(false);
    if (added) setText('');
  }

  return (
    <form className="quick-add" onSubmit={submit}>
      <span className="quick-add__plus" aria-hidden="true">+</span>
      <input
        ref={inputRef}
        className="quick-add__input"
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && setText('')}
        placeholder="Add a task — try “Pay rent friday p1”"
        aria-label="Add a task"
        maxLength={260}
      />

      {(effectiveDueDate || parsed.priority) && (
        <span className="quick-add__chips">
          {effectiveDueDate && (
            <span className="chip chip--date">{describeDueDate(effectiveDueDate)}</span>
          )}
          {parsed.priority && (
            <span className={`chip chip--${parsed.priority}`}>{PRIORITY_LABEL[parsed.priority]}</span>
          )}
        </span>
      )}

      <button type="submit" className="quick-add__submit" disabled={!parsed.title || submitting}>
        {submitting ? 'Adding' : 'Add'}
      </button>
    </form>
  );
}
