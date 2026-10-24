import { AccessProfile, hasPermission } from '../../types/academy';

// Bump only when the guide changes materially, not for every app build.
export const FEATURE_TOUR_REVISION = '2026-10-v1';
export const tourStorageKey = (revision = FEATURE_TOUR_REVISION) => `ncoa_feature_tour_seen_${revision}`;

export interface TourStep {
  id: string;
  icon: 'calendar' | 'search' | 'bell' | 'edit' | 'import' | 'academy' | 'settings';
  title: string;
  description: string;
  tips: string[];
}

export function getTourSteps(profile: AccessProfile): TourStep[] {
  const student = profile.accessLevel === 'STUDENT';
  const steps: TourStep[] = [
    {
      id: 'schedule', icon: 'calendar', title: 'Your day, at a glance',
      description: 'Welcome to your quick guide to NCOA Schedule Calendar.',
      tips: [
        'Tap a date in Calendar to see its events, times and locations.',
        profile.academy === 'KTA' ? 'Open Event View for event details and Duty NCO information.' : 'Check the uniform and notes before each event.',
        student ? 'Your calendar shows your assigned cycle.' : `You are viewing ${profile.academy}. Use the cycle selector to find the schedule you need.`
      ]
    },
    {
      id: 'search', icon: 'search', title: 'Find an event in seconds',
      description: 'Looking for a class or briefing? Start with Search in Calendar.',
      tips: [
        'Enter part of an event name, then tap a result to open that day.',
        student ? 'Search stays within your assigned cycle.' : 'Choose Current Cycle or All Cycles within the selected academy.'
      ]
    },
    {
      id: 'notifications', icon: 'bell', title: 'Catch up on changes',
      description: 'Tap the bell in Calendar to review recent schedule alerts.',
      tips: [
        'See the last 30 days of alerts and expand grouped changes.',
        'Tap an alert to open the affected schedule. Clear removes alerts from this device only.',
        'Turn on Notifications in Settings to receive alerts on your phone.'
      ]
    }
  ];
  if (hasPermission(profile, 'schedule.write')) steps.push({
    id: 'edit', icon: 'edit', title: 'Keep your schedule up to date',
    description: 'Use the pencil beside an event to edit its details.',
    tips: ['Save your changes and wait for confirmation. If saving fails, your draft stays in the editor.',
      'After saving, choose whether to notify SGLs, students, or both.',
      'Orange location notices flag shared-room overlaps between BLC and KTA.']
  });
  if (hasPermission(profile, 'schedule.import')) steps.push({
    id: 'import', icon: 'import', title: 'Preview before importing',
    description: `Bring your ${profile.academy} PDF schedule into the calendar.`,
    tips: ['Open the PDF import tool from Calendar.', 'Review the dates and events in Parsing Preview.',
      'Choose Confirm Import only after checking the preview.']
  });
  if (profile.accessLevel === 'NCOA_MANAGER' && !hasPermission(profile, 'schedule.write')) steps.push({
    id: 'academies', icon: 'academy', title: 'See both academies',
    description: 'Switch between BLC and KTA using the academy control in Settings.',
    tips: ['The selected academy has its own calendar and search results.',
      'Orange location notices help you spot shared-room overlaps. Commander access is read-only.']
  });
  if (profile.accessLevel === 'SENIOR') steps.push({
    id: 'conflicts', icon: 'academy', title: 'Spot schedule overlaps',
    description: 'Calendar markers help you find dates that need attention.',
    tips: ['Red indicates time conflicts within a schedule. Orange indicates a shared-location overlap between academies.',
      'Open the day to read the notice. If a check is unavailable, conflicts have not been verified.']
  });
  steps.push({
    id: 'settings', icon: 'settings', title: 'Make it yours',
    description: 'A few useful tools are always close by.',
    tips: ['Open Settings to switch Dark Mode or manage notifications.',
      'Tap the help character for quick answers about the app.',
      'Replay this guide anytime from Settings → App guide.']
  });
  return steps;
}
