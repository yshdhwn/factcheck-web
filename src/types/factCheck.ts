export type ContentType = 'image' | 'video' | 'url';

export type Verdict = 'true' | 'false' | 'misleading' | 'unverified';

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export type StepStatus = 'pending' | 'running' | 'completed';

export interface PipelineStep {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  durationMs?: number;
}

export interface EvidenceSource {
  name: string;
  url: string;
  credibility: number; 
  stance: 'supports' | 'contradicts' | 'neutral';
}

export interface FactCheckResult {
  id: string;
  contentType: ContentType;
  inputLabel: string;
  claim: string;
  verdict: Verdict;
  confidence: number; // 0–100
  summary: string;
  sources: EvidenceSource[];
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  contentType: ContentType;
  inputLabel: string;
  verdict: Verdict;
  confidence: number;
  createdAt: string;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  true: 'Verified true',
  false: 'False',
  misleading: 'Misleading',
  unverified: 'Unverified',
};
