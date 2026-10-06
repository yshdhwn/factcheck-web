import type { FactCheckResult } from '../../types/factCheck';
import { VerdictStamp } from '../common/VerdictStamp';
import { ConfidenceScore } from './ConfidenceScore';
import { DetectionDetails } from './DetectionDetails';

export function ResultCard({ result, onNewCheck }: { result: FactCheckResult; onNewCheck: () => void }) {
  return (
    <div className="result">
      <div>
        <VerdictStamp verdict={result.verdict} confidence={result.confidence} />
      </div>
      <div>
        <p className="result__claim">{result.claim}</p>
        <p className="result__summary">{result.summary}</p>
        <ConfidenceScore confidence={result.confidence} verdict={result.verdict} />
        <DetectionDetails sources={result.sources} />
        <button
          type="button"
          className="btn-analyze"
          style={{ marginTop: 24, background: 'transparent', color: 'var(--ink-navy)', border: '1px solid var(--ink-navy)' }}
          onClick={onNewCheck}
        >
          Check something else
        </button>
      </div>
    </div>
  );
}
