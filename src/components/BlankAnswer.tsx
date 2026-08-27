import { useEffect, useMemo, useRef, useState } from 'react';
import { buildBlanks } from '../utils/blanks';
import { normalizeAnswer } from '../utils/learn';

/**
 * Renders a long answer as running text with a few content words replaced by inputs.
 * A blank locks itself in green the moment it's typed correctly and hands focus to the
 * next unsolved blank, so the whole answer is completed without any clicking.
 */
export default function BlankAnswer({
  text,
  revealed,
  onAllSolved,
}: {
  text: string;
  /** When true, every blank is shown filled and read-only (used after a wrong attempt). */
  revealed: boolean;
  onAllSolved: () => void;
}) {
  const segments = useMemo(() => buildBlanks(text), [text]);
  const blanks = useMemo(() => segments.filter((s) => s.type === 'blank') as Extract<typeof segments[number], { type: 'blank' }>[], [segments]);

  const [values, setValues] = useState<string[]>(() => blanks.map(() => ''));
  const [solved, setSolved] = useState<boolean[]>(() => blanks.map(() => false));
  const [justSolved, setJustSolved] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const notifiedRef = useRef(false);

  useEffect(() => {
    setValues(blanks.map(() => ''));
    setSolved(blanks.map(() => false));
    setJustSolved(null);
    notifiedRef.current = false;
    inputRefs.current = [];
  }, [text, blanks.length]);

  useEffect(() => {
    if (revealed || notifiedRef.current) return;
    if (blanks.length > 0 && solved.every(Boolean)) {
      notifiedRef.current = true;
      onAllSolved();
    }
  }, [solved, blanks.length, revealed, onAllSolved]);

  function focusNextUnsolved(from: number, solvedState: boolean[]) {
    for (let i = from + 1; i < blanks.length; i++) {
      if (!solvedState[i]) {
        inputRefs.current[i]?.focus();
        return;
      }
    }
    for (let i = 0; i < from; i++) {
      if (!solvedState[i]) {
        inputRefs.current[i]?.focus();
        return;
      }
    }
    inputRefs.current[from]?.blur();
  }

  function handleChange(i: number, raw: string) {
    if (solved[i] || revealed) return;
    const next = [...values];
    next[i] = raw;
    setValues(next);

    if (normalizeAnswer(raw) === normalizeAnswer(blanks[i].value)) {
      const nextSolved = [...solved];
      nextSolved[i] = true;
      setSolved(nextSolved);
      setJustSolved(i);
      setTimeout(() => setJustSolved((cur) => (cur === i ? null : cur)), 400);
      setTimeout(() => focusNextUnsolved(i, nextSolved), 60);
    }
  }

  return (
    <div
      className="card-surface selectable-text"
      style={{ padding: 18, fontSize: 16, lineHeight: 2.1, textAlign: 'left' }}
    >
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <span key={i}>{seg.value}</span>;
        const isSolved = solved[seg.index] || revealed;
        return (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[seg.index] = el;
            }}
            value={isSolved ? seg.value : values[seg.index] ?? ''}
            onChange={(e) => handleChange(seg.index, e.target.value)}
            readOnly={isSolved}
            autoFocus={seg.index === 0}
            aria-label={`Mot manquant ${seg.index + 1}`}
            className={justSolved === seg.index ? 'answer-pop' : undefined}
            style={{
              width: `${Math.max(seg.value.length + 1, 4)}ch`,
              background: isSolved ? 'transparent' : 'var(--surface-2)',
              border: 'none',
              borderBottom: `2px solid ${isSolved ? 'var(--easy)' : 'var(--border)'}`,
              borderRadius: isSolved ? 0 : 8,
              padding: '2px 6px',
              margin: '0 2px',
              color: isSolved ? 'var(--easy)' : 'var(--text)',
              fontWeight: isSolved ? 700 : 500,
              fontSize: 16,
              fontFamily: 'inherit',
              textAlign: 'center',
              outline: 'none',
              transition: 'color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
            }}
          />
        );
      })}
    </div>
  );
}
