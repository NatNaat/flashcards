import { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, type CardRecord, type LearnPhase } from '../db/db';
import { getDeckSubtreeIds } from '../db/decks';
import { getCardOrder } from '../db/settings';
import { getLearnSession, saveLearnSession, clearLearnSession } from '../db/learnSessions';
import { Rating, gradeCard } from '../scheduler/scheduler';
import { gradeMeta } from '../scheduler/gradeMeta';
import { CloseIcon } from '../components/Icon';
import ParticleBurst from '../components/ParticleBurst';
import ProgressBar from '../components/ProgressBar';
import BlankAnswer from '../components/BlankAnswer';
import { pickDistractors, shuffle, isAnswerCorrect } from '../utils/learn';
import { shouldUseBlanks } from '../utils/blanks';
import { cssVars } from '../utils/style';

const CardContent = lazy(() => import('../components/CardContent'));

/** Cards worked on together before moving to the next batch (Quizlet-style rounds). */
const ROUND_SIZE = 5;

type Answered = 'none' | 'correct' | 'incorrect';

export default function Learn() {
  const { deckId } = useParams();
  const id = deckId!;
  const navigate = useNavigate();

  const [byId, setById] = useState<Map<string, CardRecord> | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [distractorPool, setDistractorPool] = useState<CardRecord[]>([]);
  const [total, setTotal] = useState(0);

  const [masteredIds, setMasteredIds] = useState<string[]>([]);
  const [roundIds, setRoundIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<LearnPhase>('mc');
  const [phaseQueue, setPhaseQueue] = useState<string[]>([]);

  const [answered, setAnswered] = useState<Answered>('none');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedValue, setTypedValue] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [miss, setMiss] = useState(false);

  useEffect(() => {
    (async () => {
      const subtreeIds = await getDeckSubtreeIds(id);
      const all = await db.cards.where('deckId').anyOf(subtreeIds).toArray();
      const map = new Map(all.map((c) => [c.id!, c]));
      setById(map);
      // Distractors come from every card in the deck (any state), so a familiar user can't
      // guess by recognising which answers belong to this session's batch.
      setDistractorPool(all.filter((c) => !c.suspended));

      const candidates = all.filter((c) => !c.suspended && c.state !== 2);
      const order = await getCardOrder();
      const ordered = (order === 'insertion' ? [...candidates].sort((a, b) => a.createdAt - b.createdAt) : shuffle(candidates)).map(
        (c) => c.id!
      );

      const saved = await getLearnSession(id);
      const savedUsable =
        saved &&
        saved.phaseQueue.some((cid) => map.has(cid) && map.get(cid)!.state !== 2) &&
        saved.roundIds.every((cid) => map.has(cid));

      if (savedUsable) {
        setOrderedIds(ordered);
        setMasteredIds(saved.masteredIds.filter((cid) => map.has(cid)));
        setRoundIds(saved.roundIds);
        setPhase(saved.phase);
        setPhaseQueue(saved.phaseQueue.filter((cid) => map.has(cid)));
        setTotal(saved.total);
        return;
      }

      setOrderedIds(ordered);
      setTotal(ordered.length);
      setMasteredIds([]);
      const firstRound = ordered.slice(0, ROUND_SIZE);
      setRoundIds(firstRound);
      setPhase('mc');
      setPhaseQueue(shuffle(firstRound));
    })();
  }, [id]);

  const current = phaseQueue.length > 0 ? byId?.get(phaseQueue[0]) : undefined;

  const mcOptions = useMemo(() => {
    if (!current || phase !== 'mc') return null;
    const distractors = pickDistractors(distractorPool, current, 3);
    if (distractors.length === 0) return null;
    return shuffle([current.back, ...distractors]);
  }, [current, phase, distractorPool]);

  // Long answers are impractical to retype verbatim, so recall becomes fill-in-the-blanks.
  const useBlanks = !mcOptions && !!current && shouldUseBlanks(current.back);

  const loading = byId === null;
  const nothingToLearn = !loading && total === 0;
  const finished = !loading && !nothingToLearn && phaseQueue.length === 0;
  const active = !loading && !nothingToLearn && !finished;

  function triggerCelebrate() {
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 800);
  }

  function triggerMiss() {
    setMiss(true);
    setTimeout(() => setMiss(false), 700);
  }

  function resolve(correct: boolean) {
    if (answered !== 'none') return;
    setAnswered(correct ? 'correct' : 'incorrect');
    if (correct) triggerCelebrate();
    else triggerMiss();
  }

  function handleMcAnswer(option: string) {
    if (answered !== 'none' || !current) return;
    setSelectedOption(option);
    resolve(option === current.back);
  }

  function handleTypedSubmit() {
    if (answered !== 'none' || !current || !typedValue.trim()) return;
    resolve(isAnswerCorrect(typedValue, current.back));
  }

  async function advance() {
    if (!current?.id || answered === 'none') return;
    const cardId = current.id;
    const correct = answered === 'correct';

    let nextMastered = masteredIds;
    let nextRoundIds = roundIds;
    let nextPhase = phase;
    let nextQueue = phaseQueue.slice(1);

    if (correct) {
      if (phase === 'written') {
        // Clearing the written phase is what "learning" a card means — grade it into FSRS.
        await gradeCard(current, Rating.Good, 'learn');
        nextMastered = [...masteredIds, cardId];
      }
    } else {
      // Missed cards come back later in the same phase rather than blocking progress.
      nextQueue = [...nextQueue, cardId];
    }

    if (nextQueue.length === 0) {
      if (phase === 'mc') {
        nextPhase = 'written';
        nextQueue = shuffle(roundIds);
      } else {
        // Round complete: pull the next batch of untouched cards.
        const remaining = orderedIds.filter((cid) => !nextMastered.includes(cid));
        nextRoundIds = remaining.slice(0, ROUND_SIZE);
        nextPhase = 'mc';
        nextQueue = shuffle(nextRoundIds);
      }
    }

    setMasteredIds(nextMastered);
    setRoundIds(nextRoundIds);
    setPhase(nextPhase);
    setPhaseQueue(nextQueue);

    if (nextQueue.length === 0) {
      await clearLearnSession(id);
    } else {
      await saveLearnSession({
        deckId: id,
        masteredIds: nextMastered,
        roundIds: nextRoundIds,
        phase: nextPhase,
        phaseQueue: nextQueue,
        total,
        updatedAt: Date.now(),
      });
    }

    setAnswered('none');
    setSelectedOption(null);
    setTypedValue('');
  }

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (answered !== 'none') {
        if (e.key === 'Enter') {
          e.preventDefault();
          advance();
        }
        return;
      }
      if (mcOptions) {
        const idx = ['1', '2', '3', '4'].indexOf(e.key);
        if (idx !== -1 && mcOptions[idx]) {
          e.preventDefault();
          handleMcAnswer(mcOptions[idx]);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, answered, mcOptions, current?.id]);

  if (loading) return null;

  const progress = total === 0 ? 1 : masteredIds.length / total;
  const roundPosition = roundIds.length - phaseQueue.length + 1;

  return (
    <div className="screen screen-enter" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Fermer l'apprentissage"
          className="icon-btn"
          style={{ color: 'var(--text-dim)' }}
        >
          <CloseIcon size={18} />
        </button>
        {!nothingToLearn && (
          <div style={{ flex: 1 }}>
            <ProgressBar value={progress} color="var(--good)" ariaLabel="Progression de l'apprentissage" />
          </div>
        )}
      </div>

      {active && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
          <span style={{ fontWeight: 600 }}>{phase === 'mc' ? 'Reconnaître' : 'Se souvenir'}</span>
          <span className="tabular-nums">
            {Math.min(roundPosition, roundIds.length)} / {roundIds.length} · {masteredIds.length} apprises
          </span>
        </div>
      )}

      {nothingToLearn ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <h2 style={{ fontSize: 22 }}>Rien à apprendre</h2>
          <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>
            Toutes les cartes de ce deck sont déjà passées en révision normale.
          </p>
          <button className="btn-pill btn-primary" onClick={() => navigate(`/deck/${id}`)}>
            Retour au deck
          </button>
        </div>
      ) : finished ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div className="celebrate" style={{ fontSize: 64 }}>
            🎉
          </div>
          <h2 style={{ fontSize: 22 }}>Deck appris !</h2>
          <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>
            {masteredIds.length} carte{masteredIds.length > 1 ? 's' : ''} apprise{masteredIds.length > 1 ? 's' : ''}. Elles rejoignent ta file de
            révision normale.
          </p>
          <button className="btn-pill btn-primary" onClick={() => navigate(`/deck/${id}`)}>
            Retour au deck
          </button>
        </div>
      ) : (
        current && (
          <>
            <div className="card-surface card-enter" key={current.id} style={{ padding: 28, textAlign: 'center', marginBottom: 20 }}>
              <Suspense fallback={current.front}>
                <CardContent text={current.front} />
              </Suspense>
            </div>

            <div style={{ position: 'relative' }}>
              {!mcOptions && celebrate && <ParticleBurst color={gradeMeta(Rating.Easy).color} mode="burst" />}
              {!mcOptions && miss && <ParticleBurst color={gradeMeta(Rating.Again).color} mode="fall" />}

              {mcOptions ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {mcOptions.map((option, i) => {
                    const isCorrectOption = option === current.back;
                    const isSelected = option === selectedOption;
                    const revealed = answered !== 'none' && (isCorrectOption || isSelected);
                    let background = 'var(--surface-2)';
                    let color = 'var(--text)';
                    let shadow = 'var(--border)';
                    if (answered !== 'none' && isCorrectOption) {
                      background = 'var(--easy)';
                      color = 'white';
                      shadow = 'var(--easy-dark)';
                    } else if (answered === 'incorrect' && isSelected) {
                      background = 'var(--again)';
                      color = 'white';
                      shadow = 'var(--again-dark)';
                    }
                    return (
                      <button
                        key={option + i}
                        onClick={() => handleMcAnswer(option)}
                        disabled={answered !== 'none'}
                        className={`btn-pill selectable-text${revealed ? ' answer-pop' : ''}`}
                        style={{
                          position: 'relative',
                          textAlign: 'left',
                          background,
                          color,
                          fontWeight: 500,
                          opacity: 1,
                          borderRadius: 'var(--radius-md)',
                          transition: 'background-color 0.25s ease, color 0.25s ease',
                          ...cssVars({ '--btn-shadow': shadow }),
                        }}
                      >
                        {celebrate && isCorrectOption && (
                          <ParticleBurst color={gradeMeta(Rating.Easy).color} mode="burst" count={14} scale={0.75} />
                        )}
                        {miss && isSelected && <ParticleBurst color={gradeMeta(Rating.Again).color} mode="fall" count={10} scale={0.75} />}
                        <Suspense fallback={option}>
                          <CardContent text={option} />
                        </Suspense>
                      </button>
                    );
                  })}
                </div>
              ) : useBlanks ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Complète les mots manquants</div>
                  <BlankAnswer key={current.id} text={current.back} revealed={answered !== 'none'} onAllSolved={() => resolve(true)} />
                  {answered === 'none' && (
                    <button
                      className="btn-pill"
                      style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                      onClick={() => resolve(false)}
                    >
                      Voir la réponse
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    autoFocus
                    value={typedValue}
                    onChange={(e) => setTypedValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTypedSubmit()}
                    disabled={answered !== 'none'}
                    placeholder="Tape la réponse"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '14px 16px',
                      color: 'var(--text)',
                      fontSize: 16,
                    }}
                  />
                  {answered === 'none' && (
                    <button className="btn-pill btn-primary" onClick={handleTypedSubmit}>
                      Vérifier
                    </button>
                  )}
                  {answered === 'incorrect' && (
                    <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>
                      Réponse : <span style={{ color: 'var(--text)', fontWeight: 600 }}>{current.back}</span>
                    </div>
                  )}
                </div>
              )}

              {answered !== 'none' && (
                <button
                  className="btn-pill btn-primary"
                  style={{
                    width: '100%',
                    marginTop: 16,
                    ...cssVars({ '--btn-shadow': answered === 'correct' ? 'var(--easy-dark)' : 'var(--primary-dark)' }),
                    background: answered === 'correct' ? 'var(--easy)' : 'var(--primary)',
                    color: answered === 'correct' ? 'white' : 'var(--on-primary)',
                  }}
                  onClick={advance}
                >
                  Continuer
                </button>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
