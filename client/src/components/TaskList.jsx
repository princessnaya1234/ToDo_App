import TaskItem from './TaskItem.jsx';

/** The task list, plus the empty and loading states it stands in for. */
export default function TaskList({ tasks, loading, busyIds, filter, search, ...handlers }) {
  if (loading) {
    return (
      <ul className="tasks tasks--skeleton" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <li key={row} className="skeleton" />
        ))}
      </ul>
    );
  }

  if (!tasks.length) {
    return (
      <p className="empty">
        {search.trim()
          ? `No tasks match “${search.trim()}”.`
          : filter === 'completed'
            ? 'Nothing completed yet.'
            : filter === 'active'
              ? 'No active tasks — everything is done.'
              : 'No tasks yet. Add your first one above.'}
      </p>
    );
  }

  return (
    <ul className="tasks">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} busy={busyIds.has(task.id)} {...handlers} />
      ))}
    </ul>
  );
}
