import { describe, expect, it } from 'vitest';
import { PIPELINE, shouldPrintChapter } from '#src/commands/new/pipeline.js';

describe('PIPELINE shape', () => {
  it('chapters cover Models → Prompts → Tools → Apps → Layers → Server, in order', () => {
    const chapters = PIPELINE.map((p) => p.chapter).filter((c): c is string => Boolean(c));
    expect(chapters).toEqual(['Models', 'Prompts', 'Tools', 'Apps', 'Layers', 'Server']);
  });

  it('only the six expected steps carry a chapter (no orphan chapters)', () => {
    const stepsWithChapter = PIPELINE.filter((p) => p.chapter);
    expect(stepsWithChapter).toHaveLength(6);
  });

  it('every entry has a step (no malformed entries)', () => {
    for (const entry of PIPELINE) {
      expect(typeof entry.step).toBe('function');
    }
  });
});

describe('shouldPrintChapter', () => {
  it('prints in advanced + interactive preset mode', () => {
    expect(shouldPrintChapter({ scaffoldMode: 'preset', preset: 'advanced', yes: false })).toBe(
      true,
    );
  });

  it('suppresses for --yes (non-interactive)', () => {
    expect(shouldPrintChapter({ scaffoldMode: 'preset', preset: 'advanced', yes: true })).toBe(
      false,
    );
  });

  it('suppresses for the simple preset', () => {
    expect(shouldPrintChapter({ scaffoldMode: 'preset', preset: 'simple', yes: false })).toBe(
      false,
    );
  });

  it('suppresses for template mode', () => {
    expect(shouldPrintChapter({ scaffoldMode: 'template', preset: 'advanced', yes: false })).toBe(
      false,
    );
  });

  it('suppresses for offlineTemplate mode', () => {
    expect(
      shouldPrintChapter({ scaffoldMode: 'offlineTemplate', preset: 'advanced', yes: false }),
    ).toBe(false);
  });

  it('suppresses when scaffoldMode is undefined (interactive forks still ahead)', () => {
    expect(shouldPrintChapter({ scaffoldMode: undefined, preset: 'advanced', yes: false })).toBe(
      false,
    );
  });
});
