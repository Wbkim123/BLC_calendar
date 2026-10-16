const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getCrossAcademyConflictNotices,
  isAuthorizedForCrossAcademyConflicts
} = require('./crossAcademyConflicts');

const schedule = (date, events) => ({ date, events });
const event = (id, time, location, eventName = `PRIVATE ${id}`) => ({ id, time, location, eventName });

describe('cross-academy conflict summaries', () => {
  it('authorizes only the requested academy Chief or the NCOA-wide manager', () => {
    assert.equal(isAuthorizedForCrossAcademyConflicts({ admin: true, scope: 'BLC' }, 'BLC'), true);
    assert.equal(isAuthorizedForCrossAcademyConflicts({ admin: true, scope: 'KTA' }, 'KTA'), true);
    assert.equal(isAuthorizedForCrossAcademyConflicts({ admin: true, scope: 'BLC' }, 'KTA'), false);
    assert.equal(isAuthorizedForCrossAcademyConflicts({ ncoaManager: true, scope: 'NCOA' }, 'KTA'), true);
    assert.equal(isAuthorizedForCrossAcademyConflicts({ admin: true, scope: 'NCOA' }, 'KTA'), false);
    assert.equal(isAuthorizedForCrossAcademyConflicts({}, 'BLC'), false);
  });

  it('returns only own event IDs, shared location, and the other academy for overlapping AUD/MPR events', () => {
    const notices = getCrossAcademyConflictNotices('BLC', {
      a: schedule('2026-10-01', [event('own', '0900-1100', 'MPR')])
    }, {
      a: schedule('2026-10-01', [event('other-secret-id', '1000-1200', 'MPR', 'SECRET EVENT')])
    }, ['2026-10-01']);

    assert.deepEqual(notices, [{ date: '2026-10-01', eventId: 'own', location: 'MPR', otherAcademy: 'KTA' }]);
    assert.equal(JSON.stringify(notices).includes('SECRET'), false);
    assert.equal(JSON.stringify(notices).includes('other-secret-id'), false);
  });

  it('normalizes auditorium names and supports the reciprocal KTA view', () => {
    assert.deepEqual(getCrossAcademyConflictNotices('KTA',
      { a: schedule('2026-10-02', [event('kta-own', '0900-1000', 'auditorium')]) },
      { a: schedule('2026-10-02', [event('blc-own', '0900-1000', 'AUD')]) },
      ['2026-10-02']), [
      { date: '2026-10-02', eventId: 'kta-own', location: 'AUD', otherAcademy: 'BLC' }
    ]);
  });

  it('rejects non-shared rooms, non-overlapping times, invalid and open-ended time ranges, and unrequested dates', () => {
    const own = { a: schedule('2026-10-03', [
      event('room', '0900-1100', 'DFC'),
      event('edge', '0900-1000', 'MPR'),
      event('utc', '0900-UTC', 'AUD')
    ]), b: schedule('2026-10-04', [event('not-requested', '0900-1100', 'MPR')]) };
    const other = { a: schedule('2026-10-03', [
      event('room-other', '0900-1100', 'DFC'),
      event('touching', '1000-1100', 'MPR'),
      event('utc-other', '0900-1100', 'AUD')
    ]), b: schedule('2026-10-04', [event('not-requested-other', '0900-1100', 'MPR')]) };
    assert.deepEqual(getCrossAcademyConflictNotices('BLC', own, other, ['2026-10-03']), []);
  });
});
