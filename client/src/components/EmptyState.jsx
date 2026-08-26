const COPY = {
  today: {
    title: 'Nothing due today',
    body: 'Enjoy it, or pull something forward from Upcoming.'
  },
  upcoming: {
    title: 'Nothing scheduled',
    body: 'Add a task with a date — try typing “review notes friday”.'
  },
  all: {
    title: 'Your list is empty',
    body: 'Add your first task above and it will show up here.'
  },
  completed: {
    title: 'Nothing completed yet',
    body: 'Tick something off and it will collect here.'
  },
  search: {
    title: 'No matches',
    body: 'Try a shorter search, or clear it to see everything.'
  }
};

/** Friendly placeholder — an empty list should still feel like the app. */
export default function EmptyState({ view, searching }) {
  const { title, body } = COPY[searching ? 'search' : view] ?? COPY.all;

  return (
    <div className="empty">
      <svg className="empty__art" viewBox="0 0 120 90" fill="none" aria-hidden="true">
        <rect x="21" y="13" width="78" height="66" rx="10" className="empty__card" />
        <path d="M36 34h34M36 46h48M36 58h26" className="empty__lines" strokeLinecap="round" />
        <circle cx="88" cy="62" r="16" className="empty__badge" />
        <path
          d="M81 62.5l4.5 4.5L96 57"
          className="empty__tick"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
