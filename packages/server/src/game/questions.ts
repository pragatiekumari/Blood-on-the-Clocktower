import { nanoid } from 'nanoid';
import type { GameSession, QuestionEntry } from '../session/store.js';
import { Errors } from '../errors.js';

/**
 * Adds a question to the queue. Evil players' questions are inserted ahead
 * of all pending (unanswered) Good players' questions, but after any
 * already-answered ones and after other Evil questions already queued —
 * i.e. within the unanswered tail of the queue, Evil-submitted questions
 * sort before Good-submitted ones, preserving submission order within each
 * group. This gives "Evils ask first" without reordering history once
 * answered.
 */
export function askQuestion(session: GameSession, playerId: string, text: string): QuestionEntry {
  const player = session.players.get(playerId);
  if (!player) throw Errors.playerNotFound();

  const entry: QuestionEntry = {
    id: nanoid(10),
    playerId,
    playerName: player.displayName,
    text,
    answer: null,
    answered: false,
    askedAt: Date.now(),
  };

  const isEvil = player.alignment === 'evil';
  if (!isEvil) {
    session.questionQueue.push(entry);
    return entry;
  }

  // Insert this Evil question after the last currently-unanswered Evil
  // question (or after the last answered question if there are none yet),
  // i.e. at the front of the unanswered Good questions.
  let insertAt = session.questionQueue.length;
  for (let i = 0; i < session.questionQueue.length; i++) {
    const q = session.questionQueue[i]!;
    const qIsEvil = session.players.get(q.playerId)?.alignment === 'evil';
    if (!q.answered && !qIsEvil) {
      insertAt = i;
      break;
    }
  }
  session.questionQueue.splice(insertAt, 0, entry);
  return entry;
}

/** The single question currently open for the Storyteller to answer (the front of the unanswered queue), or null if none pending. */
export function activeQuestion(session: GameSession): QuestionEntry | null {
  return session.questionQueue.find((q) => !q.answered) ?? null;
}

export function answerQuestion(session: GameSession, questionId: string, answer: string): QuestionEntry {
  const question = session.questionQueue.find((q) => q.id === questionId);
  if (!question) throw Errors.questionNotFound();
  if (question.answered) throw Errors.questionAlreadyAnswered();
  if (activeQuestion(session)?.id !== questionId) throw Errors.questionNotActive();
  question.answer = answer;
  question.answered = true;
  return question;
}

/** Called when transitioning into a new day: clears the prior day's question queue. */
export function resetQuestionQueue(session: GameSession): void {
  session.questionQueue = [];
}
