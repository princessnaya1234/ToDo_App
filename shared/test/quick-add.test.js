import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseQuickAdd, toISODate } from '../model.js';

// Wednesday 26 August 2026, so weekday phrases have a known answer.
const TODAY = new Date(2026, 7, 26);
const parse = (text) => parseQuickAdd(text, { today: TODAY });

describe('parseQuickAdd: plain text', () => {
  it('leaves ordinary titles alone', () => {
    const result = parse('Email the landlord about the boiler');
    assert.equal(result.title, 'Email the landlord about the boiler');
    assert.equal(result.dueDate, null);
    assert.equal(result.priority, null);
    assert.deepEqual(result.matched, []);
  });

  it('returns a null title for blank input', () => {
    assert.equal(parse('   ').title, null);
    assert.equal(parse('tomorrow').title, null);
  });
});

describe('parseQuickAdd: priority', () => {
  it('maps p1 to p4 with p1 most urgent', () => {
    assert.equal(parse('Ship it p1').priority, 'high');
    assert.equal(parse('Ship it p2').priority, 'normal');
    assert.equal(parse('Ship it p3').priority, 'low');
    assert.equal(parse('Ship it p4').priority, 'low');
  });

  it('strips the token from the title', () => {
    assert.equal(parse('Ship it p1').title, 'Ship it');
  });

  it('ignores priorities inside words', () => {
    const result = parse('Deploy to p1-cluster');
    assert.equal(result.priority, null);
    assert.equal(result.title, 'Deploy to p1-cluster');
  });

  it('takes only the first priority given', () => {
    assert.equal(parse('Task p1 p3').priority, 'high');
  });
});

describe('parseQuickAdd: dates', () => {
  const cases = [
    ['Gym today', '2026-08-26'],
    ['Gym tonight', '2026-08-26'],
    ['Gym tomorrow', '2026-08-27'],
    ['Standup friday', '2026-08-28'],
    ['Standup next monday', '2026-08-31'],
    ['Review in 3 days', '2026-08-29'],
    ['Review in 1 day', '2026-08-27'],
    ['Plan in 2 weeks', '2026-09-09'],
    ['Retro next week', '2026-09-02'],
    ['Rent 2026-09-01', '2026-09-01']
  ];

  for (const [input, expected] of cases) {
    it(`understands "${input}"`, () => {
      assert.equal(parse(input).dueDate, expected);
    });
  }

  it('rolls a weekday forward when it is today', () => {
    // Wednesday typed on a Wednesday means next Wednesday, not today.
    assert.equal(parse('Meeting wednesday').dueDate, '2026-09-02');
  });

  it('strips the date phrase from the title', () => {
    assert.equal(parse('Book flights next monday').title, 'Book flights');
    assert.equal(parse('Review in 3 days').title, 'Review');
  });

  it('takes only the first date given', () => {
    assert.equal(parse('Task today tomorrow').dueDate, '2026-08-26');
  });

  it('ignores an impossible calendar date', () => {
    const result = parse('Task 2026-02-30');
    assert.equal(result.dueDate, null);
    assert.equal(result.title, 'Task 2026-02-30');
  });

  it('is case insensitive', () => {
    assert.equal(parse('Task TOMORROW').dueDate, '2026-08-27');
  });
});

describe('parseQuickAdd: combined', () => {
  it('reads a date and a priority from one line', () => {
    const result = parse('Buy milk tomorrow p1');
    assert.deepEqual(
      { title: result.title, dueDate: result.dueDate, priority: result.priority },
      { title: 'Buy milk', dueDate: '2026-08-27', priority: 'high' }
    );
  });

  it('handles tokens in any order', () => {
    const result = parse('p2 next friday Submit the form');
    assert.equal(result.title, 'Submit the form');
    assert.equal(result.priority, 'normal');
    assert.equal(result.dueDate, '2026-09-04');
  });

  it('reports what it matched so the UI can show it', () => {
    assert.deepEqual(parse('Buy milk tomorrow p1').matched.sort(), ['p1', 'tomorrow']);
  });
});

describe('toISODate', () => {
  it('uses the local calendar day, not UTC', () => {
    // Late evening: a UTC conversion would roll this to the next day.
    assert.equal(toISODate(new Date(2026, 0, 31, 23, 30)), '2026-01-31');
  });
});
