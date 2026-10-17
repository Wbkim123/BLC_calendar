const normalizeSharedLocation = value => {
  const location = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (location === 'AUD' || location === 'AUDITORIUM') return 'AUD';
  return location === 'MPR' ? 'MPR' : null;
};

const getTimeRange = event => {
  const parts = typeof event?.time === 'string' ? event.time.split('-') : [];
  if (parts.length !== 2 || !/^\d{3,4}$/.test(parts[0].trim()) || !/^\d{3,4}$/.test(parts[1].trim())) return null;
  const start = Number(parts[0]);
  const end = Number(parts[1]);
  return Number.isFinite(start) && Number.isFinite(end) && start < end ? [start, end] : null;
};

const eventsOverlap = (first, second) => {
  const a = getTimeRange(first);
  const b = getTimeRange(second);
  return Boolean(a && b && a[0] < b[1] && b[0] < a[1]);
};

const scheduleValues = value => value && typeof value === 'object' ? Object.values(value) : [];

const isAuthorizedForCrossAcademyConflicts = (claims, academy) =>
  (claims?.admin === true && claims.scope === academy)
  || (claims?.ncoaManager === true && claims.scope === 'NCOA');

const isAuthorizedSglCode = (code, academy, seniorCode, scopedSeniorCode) => {
  const normalized = typeof code === 'string' ? code.replace(/\s+/g, '').toUpperCase() : '';
  const expected = typeof seniorCode === 'string' ? seniorCode.replace(/\s+/g, '').toUpperCase() : '';
  const scoped = typeof scopedSeniorCode === 'string' ? scopedSeniorCode.replace(/\s+/g, '').toUpperCase() : '';
  if (!['BLC', 'KTA'].includes(academy)) return false;
  return Boolean((expected && academy === 'BLC' && normalized === expected)
    || (scoped && normalized === `${academy}${scoped}`));
};

const getCrossAcademyConflictNotices = (academy, ownScheduleData, otherScheduleData, dates) => {
  const otherAcademy = academy === 'BLC' ? 'KTA' : 'BLC';
  const dateSet = new Set(dates);
  const ownSchedules = scheduleValues(ownScheduleData).filter(day => dateSet.has(day?.date));
  const otherByDate = new Map(scheduleValues(otherScheduleData)
    .filter(day => dateSet.has(day?.date))
    .map(day => [day.date, day]));
  const notices = new Map();

  ownSchedules.forEach(day => {
    const otherDay = otherByDate.get(day.date);
    if (!otherDay) return;
    (day.events || []).forEach(ownEvent => {
      const ownLocation = normalizeSharedLocation(ownEvent?.location);
      if (!ownLocation || typeof ownEvent?.id !== 'string' || !ownEvent.id) return;
      (otherDay.events || []).forEach(otherEvent => {
        if (ownLocation !== normalizeSharedLocation(otherEvent?.location) || !eventsOverlap(ownEvent, otherEvent)) return;
        const key = `${day.date}\u0000${ownEvent.id}\u0000${ownLocation}\u0000${otherAcademy}`;
        notices.set(key, { date: day.date, eventId: ownEvent.id, location: ownLocation, otherAcademy });
      });
    });
  });

  return Array.from(notices.values());
};

module.exports = { getCrossAcademyConflictNotices, isAuthorizedForCrossAcademyConflicts, isAuthorizedSglCode };
