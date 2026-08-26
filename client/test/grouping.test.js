import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { countsByView, groupTasks, tasksForView } from '../src/lib/grouping.js';

const TODAY = '2026-08-26'; // a Wednesday

let counter = 0;
const task = (overrides = {}) => ({
  id: `id-${counter += 1}`,
  title: `Task ${counter}`,
  notes: '',
  completed: false,
  priority: 'normal',
  dueDate: null,
  createdAt: `2026-01-${String((counter % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
  ...overrides
});

describe('groupTasks', () => {
  it('places each task in the right section', () => {
    const groups = groupTasks(
      [
        task({ title: 'late', dueDate: '2026-08-20' }),
        task({ title: 'now', dueDate: TODAY }),
        task({ title: 'next', dueDate: '2026-08-27' }),
        task({ title: 'friday', dueDate: '2026-08-28' }),
        task({ title: 'far', dueDate: '2026-10-01' }),
        task({ title: 'undated' }),
        task({ title: 'finished', completed: true })
      ],
      TODAY
    );

    assert.deepEqual(
      groups.map((group) => [group.key, group.tasks.map((t) => t.title)]),
      [
        ['overdue', ['late']],
        ['today', ['now']],
        ['tomorrow', ['next']],
        ['week', ['friday']],
        ['later', ['far']],
        ['someday', ['undated']],
        ['done', ['finished']]
      ]
    );
  });

  it('omits empty sections', () => {
    const groups = groupTasks([task({ dueDate: TODAY })], TODAY);
    assert.deepEqual(groups.map((group) => group.key), ['today']);
  });

  it('returns nothing for an empty list', () => {
    assert.deepEqual(groupTasks([], TODAY), []);
  });

  it('treats a completed but overdue task as done, not overdue', () => {
    const groups = groupTasks([task({ dueDate: '2026-01-01', completed: true })], TODAY);
    assert.deepEqual(groups.map((group) => group.key), ['done']);
  });

  it('sorts by due date, then priority, then age', () => {
    const groups = groupTasks(
      [
        task({ title: 'later-normal', dueDate: '2026-09-30' }),
        task({ title: 'sooner-low', dueDate: '2026-09-02', priority: 'low' }),
        task({ title: 'sooner-high', dueDate: '2026-09-02', priority: 'high' })
      ],
      TODAY
    );
    assert.deepEqual(groups[0].tasks.map((t) => t.title), [
      'sooner-high',
      'sooner-low',
      'later-normal'
    ]);
  });

  it('puts the week boundary at the end of the current week', () => {
    // Wed 26 Aug: Sunday 30th is still this week, Monday 31st is later.
    const groups = groupTasks(
      [task({ title: 'sunday', dueDate: '2026-08-30' }), task({ title: 'monday', dueDate: '2026-08-31' })],
      TODAY
    );
    assert.deepEqual(groups.map((group) => [group.key, group.tasks[0].title]), [
      ['week', 'sunday'],
      ['later', 'monday']
    ]);
  });
});

describe('views', () => {
  const tasks = [
    task({ title: 'overdue', dueDate: '2026-08-01' }),
    task({ title: 'today', dueDate: TODAY }),
    task({ title: 'future', dueDate: '2026-09-15' }),
    task({ title: 'undated' }),
    task({ title: 'done', completed: true })
  ];

  it('counts each view over the whole list', () => {
    assert.deepEqual(countsByView(tasks, TODAY), {
      today: 2, // overdue counts as today's problem
      upcoming: 1,
      all: 4,
      completed: 1
    });
  });

  it('selects the tasks for a view', () => {
    assert.deepEqual(tasksForView(tasks, 'today', TODAY).map((t) => t.title), ['overdue', 'today']);
    assert.deepEqual(tasksForView(tasks, 'upcoming', TODAY).map((t) => t.title), ['future']);
    assert.deepEqual(tasksForView(tasks, 'completed', TODAY).map((t) => t.title), ['done']);
    assert.equal(tasksForView(tasks, 'all', TODAY).length, 4);
  });
});
