/** Date helpers for due-date display. Dates are plain `YYYY-MM-DD` strings. */

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(task) {
  return Boolean(!task.completed && task.dueDate && task.dueDate < today());
}

/** "Due today", "2 days overdue", "Due 5 Mar" — whichever reads best. */
export function describeDueDate(dueDate) {
  const day = 86_400_000;
  const diff = Math.round(
    (new Date(`${dueDate}T00:00:00`) - new Date(`${today()}T00:00:00`)) / day
  );

  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff === -1) return 'Due yesterday';
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff <= 7) return `Due in ${diff} days`;

  return `Due ${new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short'
  })}`;
}
