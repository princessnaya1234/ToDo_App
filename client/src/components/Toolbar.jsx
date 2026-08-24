const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' }
];

const SORTS = [
  { value: 'created', label: 'Date added' },
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'alpha', label: 'A–Z' }
];

/** Filter tabs, search box and sort selector. */
export default function Toolbar({ filter, onFilterChange, search, onSearchChange, sort, onSortChange }) {
  return (
    <div className="toolbar">
      <div className="tabs" role="tablist" aria-label="Filter tasks">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            className={`tab${filter === value ? ' tab--active' : ''}`}
            onClick={() => onFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="toolbar__controls">
        <input
          type="search"
          className="input input--search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search tasks…"
          aria-label="Search tasks"
        />
        <label className="field field--inline">
          <span className="sr-only">Sort by</span>
          <select value={sort} onChange={(event) => onSortChange(event.target.value)} aria-label="Sort tasks">
            {SORTS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
