import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isAiEnabled, parseAiJson } from './ai';

describe('AI utilities', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
    else delete process.env.ANTHROPIC_API_KEY;
    vi.restoreAllMocks();
  });

  it('isAiEnabled returns false when key missing', () => {
    expect(isAiEnabled()).toBe(false);
  });

  it('isAiEnabled returns true when key set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    expect(isAiEnabled()).toBe(true);
  });

  it('parseAiJson returns fallback on null', () => {
    expect(parseAiJson(null, { suggestions: [] })).toEqual({ suggestions: [] });
  });

  it('parseAiJson strips markdown fences', () => {
    const result = parseAiJson('```json\n{"suggestions":[]}\n```', { suggestions: [{ item_id: 'x', reason: 'y' }] });
    expect(result).toEqual({ suggestions: [] });
  });

  it('parseAiJson returns fallback on invalid JSON', () => {
    const fallback = { has_usual: false };
    expect(parseAiJson('not json', fallback)).toEqual(fallback);
  });
});
