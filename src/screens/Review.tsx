import { useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, type CardRecord } from '../db/db';
import { getDeckSubtreeIds } from '../db/decks';
import { getSwipeGradeMap, getCardOrder } from '../db/settings';
import { useLiveQuery } from 'dexie-react-hooks';
import { Rating, gradeCard, previewIntervals, formatDue, type Grade } from '../scheduler/scheduler';
import { GRADE_META, gradeMeta } from '../scheduler/gradeMeta';
import type { SwipeDirection } from '../settings/swipe';
import { CloseIcon } from '../components/Icon';
import GradeEffect from '../components/GradeEffect';
import ProgressBar from '../components/ProgressBar';
import { clozeSegments } from '../utils/cloze';
import { shuffle } from '../utils/learn';
import { cssVars } from '../utils/style';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const CardContent = lazy(() => import('../components/CardContent'));

const MOVE_THRESHOLD = 16;
const SWIPE_THRESHOLD = 90;
const EFFECT_DELAY = 650;

function directionFromOffset(x: number, y: number): SwipeDirection | null {
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  if (Math.max(absX, absY) < MOVE_THRESHOLD) return null;
  return absX > absY ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
}

export default function Review() {
  const { deckId } = useParams();
  const id = deckId!;
  const navigate = useNavigate();

  const [queue, setQueue] = useState<CardRecord[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [total, setTotal] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [activeEffect, setActiveEffect] = useState<Grade | null>(null);
  const [shake, setShake] = useState(false);
  const [gradingLocked, setGradingLocked] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const reduceMotion = usePrefersReducedMotion();

  const swipeMap = useLiveQuery(() => getSwipeGradeMap(), []);

  useEffect(() => {
    (async () => {
      const now = Date.now();
      const subtreeIds = await getDeckSubtreeIds(id);
      const all = await db.cards.where('deckId').anyOf(subtreeIds).toArray();
      const order = await getCardOrder();
      const due = order === 'random' ? shuffle(all.filter((c) => !c.suspended && new Date(c.due).getTime() <= now)) : all.filter((c) => !c.suspended && new Date(c.due).getTime() <= now);
      // Primary sort is always due-date (that's the point of spaced repetition); the order
      // setting only breaks ties among cards due at the same time — either the pre-shuffled
      // order above (random) or insertion order (stable sort keeps createdAt order for ties).
      due.sort((a, b) => {
        const dueDiff = new Date(a.due).getTime() - new Date(b.due).getTime();
        if (dueDiff !== 0) return dueDiff;
        return order === 'insertion' ? a.createdAt - b.createdAt : 0;
      });
      setQueue(due);
      setTotal(due.length);
    })();
  }, [id]);

  const current = queue?.[index];
  const intervals = useMemo(() => (current ? previewIntervals(current) : null), [current]);

  async function grade(g: Grade) {
    if (!current || gradingLocked) return;
    setGradingLocked(true);
    setActiveEffect(g);
    if (g === Rating.Again) {
      setShake(true);
      setTimeout(() => setShake(false), 420);
    }
    await gradeCard(current, g);
    setTimeout(() => {
      setFlipped(false);
      setDragOffset({ x: 0, y: 0 });
      setActiveEffect(null);
      setIndex((i) => i + 1);
      setGradingLocked(false);
    }, EFFECT_DELAY);
  }

  const nothingToReview = total === 0;
  const finished = !nothingToReview && queue !== null && index >= queue.length;
  const active = queue !== null && !nothingToReview && !finished;

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (gradingLocked) return;
      if (!flipped) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setFlipped(true);
        }
        return;
      }
      const gradeIndex = ['1', '2', '3', '4'].indexOf(e.key);
      if (gradeIndex !== -1) {
        e.preventDefault();
        grade(GRADE_META[gradeIndex].grade);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, flipped, current, gradingLocked]);

  function onPointerDown(e: React.PointerEvent) {
    if (!flipped || gradingLocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    setDragOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }

  function onPointerUp() {
    if (!dragStart.current) return;
    dragStart.current = null;
    setDragging(false);
    const direction = directionFromOffset(dragOffset.x, dragOffset.y);
    const distance = Math.max(Math.abs(dragOffset.x), Math.abs(dragOffset.y));
    if (direction && swipeMap && distance >= SWIPE_THRESHOLD) {
      grade(swipeMap[direction]);
      return;
    }
    setDragOffset({ x: 0, y: 0 });
  }

  if (queue === null) return null;

  const progress = total === 0 ? 1 : index / total;
  const previewDirection = dragging ? directionFromOffset(dragOffset.x, dragOffset.y) : null;
  const previewMeta = previewDirection && swipeMap ? gradeMeta(swipeMap[previewDirection]) : null;
  const previewIntensity = Math.min(1, Math.max(Math.abs(dragOffset.x), Math.abs(dragOffset.y)) / SWIPE_THRESHOLD);

  return (
    <div className="screen screen-enter" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Fermer la révision"
          className="icon-btn"
          style={{ color: 'var(--text-dim)' }}
        >
          <CloseIcon size={18} />
        </button>
        {!nothingToReview && (
          <div style={{ flex: 1 }}>
            <ProgressBar value={progress} color="var(--primary)" ariaLabel="Progression de la révision" />
          </div>
        )}
      </div>

      {nothingToReview ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <h2 style={{ fontSize: 22 }}>Rien à réviser</h2>
          <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>
            Il n'y a aucune carte à réviser dans ce deck pour l'instant.
          </p>
          <button className="btn-pill btn-primary" onClick={() => navigate(`/deck/${id}`)}>
            Retour au deck
          </button>
        </div>
      ) : finished ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div className="celebrate" style={{ fontSize: 64 }}>🎉</div>
          <h2 style={{ fontSize: 22 }}>Session terminée</h2>
          <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>
            {total} carte{total > 1 ? 's' : ''} révisée{total > 1 ? 's' : ''}. Bien joué !
          </p>
          <button className="btn-pill btn-primary" onClick={() => navigate(`/deck/${id}`)}>
            Retour au deck
          </button>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {activeEffect !== null && <GradeEffect grade={activeEffect} />}
            {previewMeta && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  zIndex: 1,
                  padding: '6px 16px',
                  borderRadius: 999,
                  background: previewMeta.color,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 14,
                  opacity: previewIntensity,
                  pointerEvents: 'none',
                }}
              >
                {previewMeta.label}
              </div>
            )}
            <button
              type="button"
              aria-label={flipped ? 'Réponse affichée' : 'Afficher la réponse'}
              onClick={() => !flipped && !gradingLocked && setFlipped(true)}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={shake ? 'card-shake' : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: flipped ? 'grab' : 'pointer',
                touchAction: 'none',
              }}
            >
              <div key={current?.id} className="card-enter" style={{ width: '100%', perspective: 1200 }}>
                <div
                  style={{
                    width: '100%',
                    minHeight: 260,
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    transition: dragging || reduceMotion ? 'none' : 'transform 0.4s var(--ease-out)',
                    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.04}deg) rotateY(${flipped ? 180 : 0}deg)`,
                  }}
                >
                  <div
                    className="card-surface selectable-text"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 28,
                      textAlign: 'center',
                      fontSize: 20,
                      fontWeight: 600,
                      overflowY: 'auto',
                    }}
                  >
                    {current && (
                      <Suspense fallback={current.front}>
                        <CardContent text={current.front} />
                      </Suspense>
                    )}
                  </div>
                  <div
                    className="card-surface selectable-text"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 28,
                      textAlign: 'center',
                      fontSize: 18,
                      color: 'var(--text-dim)',
                      overflowY: 'auto',
                    }}
                  >
                    {current?.type === 'cloze' && current.clozeText ? (
                      clozeSegments(current.clozeText).map((seg, i) =>
                        seg.revealed ? (
                          <span key={i} style={{ color: 'var(--primary-fg)', fontWeight: 700 }}>
                            {seg.text}
                          </span>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        )
                      )
                    ) : (
                      current && (
                        <Suspense fallback={current.back}>
                          <CardContent text={current.back} />
                        </Suspense>
                      )
                    )}
                  </div>
                </div>
              </div>
            </button>
          </div>

          {!flipped ? (
            <button className="btn-pill btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={() => setFlipped(true)}>
              Afficher la réponse
            </button>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
              {GRADE_META.map((btn) => (
                <button
                  key={btn.grade}
                  onClick={() => grade(btn.grade)}
                  disabled={gradingLocked}
                  className="btn-pill"
                  style={{
                    background: btn.color,
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '12px 10px',
                    ...cssVars({ '--btn-shadow': btn.shadow }),
                  }}
                >
                  <span>{btn.label}</span>
                  {intervals && <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 500 }}>{formatDue(intervals[btn.grade])}</span>}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
