/**
 * Views and date grouping.
 *
 * The list reads as "what needs doing when" rather than one flat pile: tasks
 * fall into Overdue / Today / Tomorrow / This week / Later / Someday, which is
 * what makes a long list feel manageable.
 */
import { toISODate } from 'todo-shared/model.js';

export const VIEWS = {
  today: {
    label: 'Today',
    hint: 'Due today, plus anything you have run past',
    // Overdue work belongs in Today: it is what you have to deal with now.
    matches: (task, today) => !task.completed && task.dueDate && task.dueDate <= today
  },
  upcoming: {
    label: 'Upcoming',
    hint: 'Scheduled for later',
    matches: (task, today) => !task.completed && task.dueDate && task.dueDate > today
  },
  all: {
    label: 'All tasks',
    hint: 'Everything still open',
    matches: (task) => !task.completed
  },
  completed: {
    label: 'Completed',
    hint: 'Done and dusted',
    matches: (task) => task.completed
  }
};

export const VIEW_ORDER = ['today', 'upcoming', 'all', 'completed'];

export function countsByView(tasks, today = toISODate(new Date())) {
  const counts = {};
  for (const view of VIEW_ORDER) {
    counts[view] = tasks.filter((task) => VIEWS[view].matches(task, today)).length;
  }
  return counts;
}

export function tasksForView(tasks, view, today = toISODate(new Date())) {
  return tasks.filter((task) => VIEWS[view].matches(task, today));
}

function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Sunday that ends the current week, so "this week" means the days ahead. */
function endOfWeek(today) {
  const date = new Date(`${today}T00:00:00`);
  const daysLeft = (7 - date.getDay()) % 7;
  return addDays(today, daysLeft);
}

const SECTIONS = [
  { key: 'overdue', label: 'Overdue', tone: 'danger' },
  { key: 'today', label: 'Today', tone: 'accent' },
  { key: 'tomorrow', label: 'Tomorrow', tone: 'plain' },
  { key: 'week', label: 'This week', tone: 'plain' },
  { key: 'later', label: 'Later', tone: 'plain' },
  { key: 'someday', label: 'No date', tone: 'plain' },
  { key: 'done', label: 'Completed', tone: 'muted' }
];

function sectionFor(task, today) {
  if (task.completed) return 'done';
  if (!task.dueDate) return 'someday';
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate === today) return 'today';
  if (task.dueDate === addDays(today, 1)) return 'tomorrow';
  if (task.dueDate <= endOfWeek(today)) return 'week';
  return 'later';
}

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

/** Within a section: soonest first, then most urgent, then oldest. */
function compareTasks(a, b) {
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  return a.createdAt < b.createdAt ? -1 : 1;
}

/** Group tasks into ordered, non-empty sections ready to render. */
export function groupTasks(tasks, today = toISODate(new Date())) {
  const buckets = new Map(SECTIONS.map((section) => [section.key, []]));
  for (const task of tasks) buckets.get(sectionFor(task, today)).push(task);

  return SECTIONS.filter((section) => buckets.get(section.key).length > 0).map((section) => ({
    ...section,
    tasks: buckets.get(section.key).sort(compareTasks)
  }));
}
