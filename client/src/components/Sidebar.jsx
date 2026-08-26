import { VIEWS, VIEW_ORDER } from '../lib/grouping.js';

const ICONS = {
  today: (
    <>
      <rect x="3" y="4.5" width="14" height="13" rx="2.5" />
      <path d="M3 8.5h14M7 2.5v3M13 2.5v3" />
      <circle cx="10" cy="13" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  upcoming: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.75V10l2.75 2" />
    </>
  ),
  all: (
    <>
      <path d="M3 5.5h14M3 10h14M3 14.5h9" />
    </>
  ),
  completed: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M6.75 10.25l2.25 2.25 4.25-4.75" />
    </>
  )
};

/** Left rail: brand, the four views with live counts, and today's progress. */
export default function Sidebar({ view, counts, onViewChange, stats, open, onClose }) {
  const done = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <>
      <div
        className={`scrim${open ? ' scrim--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10.5l4 4 8-9"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="brand__name">Tasks</span>
        </div>

        <nav className="nav" aria-label="Views">
          {VIEW_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              className={`nav__item${view === key ? ' nav__item--active' : ''}`}
              onClick={() => onViewChange(key)}
              aria-current={view === key ? 'page' : undefined}
            >
              <svg
                className="nav__icon"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {ICONS[key]}
              </svg>
              <span className="nav__label">{VIEWS[key].label}</span>
              {counts[key] > 0 && <span className="nav__count">{counts[key]}</span>}
            </button>
          ))}
        </nav>

        <div className="progress-card">
          <div className="progress-card__head">
            <span>Progress</span>
            <strong>{done}%</strong>
          </div>
          <div className="meter" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={100}>
            <div className="meter__fill" style={{ width: `${done}%` }} />
          </div>
          <p className="progress-card__note">
            {stats.total === 0
              ? 'Nothing on your plate'
              : stats.active === 0
                ? 'All clear. Nice work.'
                : `${stats.active} still to do`}
          </p>
        </div>
      </aside>
    </>
  );
}
