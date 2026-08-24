/** Progress summary shown under the heading. */
export default function StatsBar({ stats }) {
  const percent = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="stats">
      <div className="stats__line">
        <span>
          <strong>{stats.active}</strong> of {stats.total} {stats.total === 1 ? 'task' : 'tasks'}{' '}
          remaining
        </span>
        <span className="stats__flags">
          {stats.overdue > 0 && <span className="flag flag--overdue">{stats.overdue} overdue</span>}
          {stats.dueToday > 0 && <span className="flag">{stats.dueToday} due today</span>}
        </span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tasks completed"
      >
        <div className="progress__bar" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
