import { describe, expect, it } from '@jest/globals';
import { getChatbotAnswer, getChatbotSuggestedQuestions } from './chatbotKnowledge';

describe('NCOA chatbot knowledge', () => {
  it('limits student search guidance to the assigned cycle', () => {
    expect(getChatbotAnswer('How do I search?', { academy: 'BLC', role: 'STUDENT', cycleName: '09-26' }))
      .toContain('limited to your assigned cycle');
  });

  it('provides academy-specific event detail guidance', () => {
    expect(getChatbotAnswer('Where is duty NCO?', { academy: 'KTA', role: 'VIEWER' }))
      .toContain('DUTY NCO');
  });

  it('does not offer PDF import to students', () => {
    expect(getChatbotAnswer('Can I import a PDF?', { academy: 'KTA', role: 'STUDENT' }))
      .toContain('only to authorized');
  });

  it('recommends related questions and avoids a recently asked topic', () => {
    const suggestions = getChatbotSuggestedQuestions(
      ['How do I search for an event?'],
      { academy: 'BLC', role: 'STUDENT', cycleName: '09-26' }
    );
    expect(suggestions).toContain('Where can I see event details?');
    expect(suggestions).not.toContain('How do I search for an event?');
  });

  it('keeps administrator-only suggestions away from students', () => {
    const suggestions = getChatbotSuggestedQuestions([], { academy: 'KTA', role: 'STUDENT' }, 20);
    expect(suggestions).not.toContain('How do I import a PDF?');
    expect(suggestions).toContain('Why can I only see my cycle?');
  });
});
