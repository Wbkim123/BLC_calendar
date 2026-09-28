import { AcademyId } from '../../types/academy';
import { UserRole } from '../../types/schedule';

export type ChatbotContext = {
  academy: AcademyId;
  role: UserRole;
  cycleName?: string | null;
};

type Topic = {
  keywords: string[];
  answer: (context: ChatbotContext) => string;
};

const topics: Topic[] = [
  {
    keywords: ['access code', 'code', 'login', 'sign in', '로그인', '코드'],
    answer: () => 'Access codes are assigned by authorized NCOA personnel. Enter your code on the login screen. If it is rejected, confirm the code and active cycle with your leadership.'
  },
  {
    keywords: ['search', 'find event', 'event search', '검색', '이벤트 찾'],
    answer: ({ academy, role }) => role === 'STUDENT'
      ? `Tap SEARCH on the ${academy} calendar and enter an event name. Student results are limited to your assigned cycle.`
      : `Tap SEARCH on the ${academy} calendar and enter an event name. You can choose CURRENT CYCLE or ALL CYCLES.`
  },
  {
    keywords: ['notification', 'alert', 'push', '알림'],
    answer: () => 'Open SETTINGS and enable Notifications. Also allow notifications in your phone settings. Alerts are sent when authorized staff publish schedule changes.'
  },
  {
    keywords: ['import', 'pdf', 'upload', '가져오기', '업로드'],
    answer: ({ academy, role }) => role === 'ADMIN'
      ? `Use IMPORT on the ${academy} calendar, select the correct schedule PDF, review the Parsing Preview, and confirm only after checking dates and events.`
      : 'Schedule PDF import is available only to authorized administrators or schedule importers.'
  },
  {
    keywords: ['location', 'loc', 'uniform', 'duty nco', 'uniform', '장소', '복장', '당직'],
    answer: ({ academy }) => academy === 'KTA'
      ? 'Open a scheduled date to view each event. KTA event cards show LOC and DUTY NCO information parsed from the official schedule.'
      : 'Open a scheduled date to view each event. BLC event cards show the event time, LOC, and UNI information.'
  },
  {
    keywords: ['note', 'notes', '메모', '노트'],
    answer: ({ academy, role }) => academy === 'KTA'
      ? 'KTA daily notes appear with Duty Section information at the top when it is available.'
      : role === 'STUDENT'
        ? 'Daily student notes appear below the event list. Highlighted notes contain important updates.'
        : 'Daily notes and SGL notes appear below the event list. Authorized staff can update them from the daily view.'
  },
  {
    keywords: ['blc', 'kta', 'academy', 'switch', '아카데미', '전환'],
    answer: ({ academy }) => `You are currently viewing ${academy}. Results and schedules stay within your authorized academy. NCOA managers can switch academies from the calendar header.`
  },
  {
    keywords: ['dark', 'theme', '다크', '테마'],
    answer: () => 'Open SETTINGS and turn on Dark Mode. The preference is saved on this device.'
  },
  {
    keywords: ['calendar', 'schedule', 'day', 'date', '일정', '달력', '날짜'],
    answer: ({ academy, cycleName }) => `The ${academy} calendar shows scheduled dates${cycleName ? ` for cycle ${cycleName}` : ''}. Tap a date to open its event list, notes, locations, and other details.`
  },
  {
    keywords: ['ad', 'advertisement', 'privacy', '광고', '개인정보'],
    answer: () => 'Native apps may display ads. If Ad Privacy Choices are required in your region, open SETTINGS to review or change your consent. The website does not display AdMob ads.'
  },
  {
    keywords: ['help', 'support', 'contact', 'problem', 'error', '도움', '문의', '오류'],
    answer: () => 'For unresolved access or schedule issues, open SETTINGS → SUPPORT or contact your authorized NCOA schedule manager. Include the academy, cycle, date, and event name when reporting a schedule error.'
  }
];

export const getChatbotAnswer = (question: string, context: ChatbotContext) => {
  const normalized = question.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Please enter a question.';

  let bestTopic: Topic | null = null;
  let bestScore = 0;
  for (const topic of topics) {
    const score = topic.keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? keyword.length : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestTopic
    ? bestTopic.answer(context)
    : 'I can help with access codes, event search, schedules, locations, notes, notifications, PDF import, Dark Mode, ads, and support.';
};

type SuggestedQuestion = {
  question: (context: ChatbotContext) => string;
  topicKeywords: string[];
  follows: string[];
  adminOnly?: boolean;
  studentOnly?: boolean;
  academy?: AcademyId;
};

const suggestedQuestions: SuggestedQuestion[] = [
  { question: () => 'How do I search for an event?', topicKeywords: ['search'], follows: ['calendar', 'schedule', 'event'] },
  { question: () => 'How do notifications work?', topicKeywords: ['notification'], follows: ['schedule', 'update', 'alert'] },
  { question: () => 'Where can I see event details?', topicKeywords: ['event detail', 'location', 'uniform'], follows: ['search', 'calendar', 'schedule'] },
  { question: () => 'How do I import a PDF?', topicKeywords: ['import', 'pdf'], follows: ['schedule', 'calendar'], adminOnly: true },
  { question: () => 'How do I switch between BLC and KTA?', topicKeywords: ['switch', 'blc', 'kta'], follows: ['academy', 'schedule'], adminOnly: true },
  { question: () => 'Where can I read daily notes?', topicKeywords: ['notes'], follows: ['event detail', 'calendar', 'location'] },
  { question: () => 'How do I turn on Dark Mode?', topicKeywords: ['dark mode'], follows: ['settings', 'theme'] },
  { question: () => 'What should I do if my code is rejected?', topicKeywords: ['code', 'login'], follows: ['access', 'error'] },
  { question: () => 'What does DUTY NCO show?', topicKeywords: ['duty nco'], follows: ['location', 'event detail'], academy: 'KTA' },
  { question: () => 'Where can I find LOC and UNI?', topicKeywords: ['loc', 'uni'], follows: ['location', 'event detail'], academy: 'BLC' },
  { question: () => 'Why can I only see my cycle?', topicKeywords: ['my cycle'], follows: ['search', 'calendar', 'access'], studentOnly: true },
  { question: () => 'How do I get support?', topicKeywords: ['support'], follows: ['error', 'problem', 'code'] }
];

export const getChatbotSuggestedQuestions = (
  questionHistory: string[],
  context: ChatbotContext,
  limit = 3
) => {
  const recent = questionHistory.slice(-3).map(question => question.toLowerCase());
  const lastQuestion = recent[recent.length - 1] || '';

  return suggestedQuestions
    .filter(item => !item.adminOnly || context.role === 'ADMIN')
    .filter(item => !item.studentOnly || context.role === 'STUDENT')
    .filter(item => !item.academy || item.academy === context.academy)
    .map((item, index) => {
      const wasRecentlyAsked = recent.some(question => item.topicKeywords.some(keyword => question.includes(keyword)));
      const followsLastTopic = item.follows.some(keyword => lastQuestion.includes(keyword));
      let score = 20 - index;
      if (followsLastTopic) score += 30;
      if (wasRecentlyAsked) score -= 100;
      if (context.role === 'ADMIN' && item.adminOnly) score += 5;
      if (context.role === 'STUDENT' && item.studentOnly) score += 5;
      if (item.academy === context.academy) score += 4;
      return { question: item.question(context), score };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(item => item.question);
};
