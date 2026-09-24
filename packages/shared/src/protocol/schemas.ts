import { z } from 'zod';

export const AuthPayloadSchema = z.object({
  token: z.string().min(1),
});

export const SetPhaseSchema = z.object({
  phase: z.enum(['day', 'night']),
  /** Optional countdown duration in seconds for the new phase. Omit for no timer. */
  timerSeconds: z.number().int().positive().max(3600).optional(),
});

export const SetTimerSchema = z.object({
  /** Seconds remaining from now, or null to clear the timer. */
  timerSeconds: z.number().int().positive().max(3600).nullable(),
});

export const SetPlayerStatusSchema = z.object({
  playerId: z.string().min(1),
  statusEffects: z.object({
    poisoned: z.boolean().optional(),
    drunk: z.boolean().optional(),
    protected: z.boolean().optional(),
  }),
});

export const MarkDeadSchema = z.object({
  playerId: z.string().min(1),
});

export const ShareAbilityResultSchema = z.object({
  playerId: z.string().min(1),
  text: z.string().min(1).max(500),
});

export const NominateSchema = z.object({
  targetPlayerId: z.string().min(1),
});

export const VoteSchema = z.object({
  nominationId: z.string().min(1),
  voting: z.boolean(),
});

export const CloseVoteSchema = z.object({
  nominationId: z.string().min(1),
});

export const ConfirmExecutionSchema = z.object({
  nominationId: z.string().min(1),
});

export const ChatSendSchema = z.object({
  text: z.string().min(1).max(1000),
});

export const SetPlayerAlignmentSchema = z.object({
  playerId: z.string().min(1),
  alignment: z.enum(['good', 'evil']),
});

export const ReorderSeatsSchema = z.object({
  orderedPlayerIds: z.array(z.string().min(1)).min(1),
});

export const AskQuestionSchema = z.object({
  text: z.string().min(1).max(500),
});

export const AnswerQuestionSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1).max(1000),
});

export const CreateSessionRequestSchema = z.object({});

export const JoinSessionRequestSchema = z.object({
  displayName: z.string().trim().min(1).max(30),
});
