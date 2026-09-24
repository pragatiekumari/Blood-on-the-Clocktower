import type { ActiveNominationView } from '@clocktower/shared';
import type { LobbyPlayer } from '../../hooks/useSession.js';

interface VoteTallyProps {
  nomination: ActiveNominationView;
  players: LobbyPlayer[];
  selfPlayerId: string;
  canVote: boolean;
  onVote: (voting: boolean) => void;
}

function nameFor(players: LobbyPlayer[], id: string): string {
  return players.find((p) => p.playerId === id)?.displayName ?? 'Unknown';
}

export function VoteTally({ nomination, players, selfPlayerId, canVote, onVote }: VoteTallyProps) {
  const yesVotes = nomination.votes.filter((v) => v.voting).length;
  const myVote = nomination.votes.find((v) => v.playerId === selfPlayerId);

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>
        Nomination: <span className="alignment-evil">{nameFor(players, nomination.targetId)}</span>
      </h3>
      <p className="faint">Nominated by {nameFor(players, nomination.nominatorId)}</p>
      <p>
        Votes for execution: <strong>{yesVotes}</strong>
      </p>
      {nomination.closed ? (
        <p className={nomination.pendingExecution ? 'alignment-evil' : 'muted'}>
          {nomination.pendingExecution ? 'This nomination met the threshold.' : 'This nomination did not pass.'}
        </p>
      ) : (
        <div className="mobile-stack" style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            disabled={!canVote || myVote?.voting === true}
            onClick={() => onVote(true)}
          >
            Vote to Execute
          </button>
          <button className="btn" disabled={!canVote || myVote?.voting === false} onClick={() => onVote(false)}>
            Retract / No
          </button>
        </div>
      )}
    </div>
  );
}
