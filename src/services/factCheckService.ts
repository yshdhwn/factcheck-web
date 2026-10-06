import type { ContentType, FactCheckResult, HistoryEntry, PipelineStep, Verdict } from '../types/factCheck';

// Swap this for your team's real endpoint. The rest of the app only depends
// on the analyzeImage / analyzeVideo / analyzeUrl functions below, so
// changing the transport here doesn't require touching any component.
const API_BASE = import.meta.env.VITE_FACTCHECK_API ?? '/api/factcheck';
const USE_MOCK = true; // flip to false once the real API is wired up

export const PIPELINE_STEPS: Omit<PipelineStep, 'status'>[] = [
  { id: 'extract', label: 'Claim Extractor', description: 'Identifying the core factual claim' },
  { id: 'gather', label: 'Evidence Gatherer', description: 'Searching trusted sources and fact-check archives' },
  { id: 'credibility', label: 'Credibility Evaluator', description: 'Scoring the reliability of each source' },
  { id: 'fallacy', label: 'Fallacy Detector', description: 'Checking the reasoning for gaps' },
  { id: 'weigh', label: 'Counter-Evidence Weigher', description: 'Weighing evidence for and against' },
  { id: 'report', label: 'Report Generator', description: 'Building the final verdict and summary' },
];

export type StepCallback = (steps: PipelineStep[]) => void;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMockPipeline(
  contentType: ContentType,
  inputLabel: string,
  onProgress?: StepCallback
): Promise<FactCheckResult> {
  const steps: PipelineStep[] = PIPELINE_STEPS.map((s) => ({ ...s, status: 'pending' }));
  onProgress?.([...steps]);

  for (let i = 0; i < steps.length; i++) {
    steps[i].status = 'running';
    onProgress?.([...steps]);
    const duration = 500 + Math.random() * 700;
    await delay(duration);
    steps[i].status = 'completed';
    steps[i].durationMs = Math.round(duration);
    onProgress?.([...steps]);
  }

  const verdicts: Verdict[] = ['true', 'false', 'misleading', 'unverified'];
  const seed = inputLabel.length + contentType.length;
  const verdict = verdicts[seed % verdicts.length];
  const confidence = 62 + ((seed * 7) % 35);

  const summaries: Record<Verdict, string> = {
    true: 'The core claim is corroborated by multiple independent, high-credibility sources with no material contradictions found.',
    false: 'The claim contradicts verifiable evidence from high-credibility sources and shows signs of manipulation.',
    misleading: 'Parts of the claim are accurate, but the framing omits key context that changes its meaning.',
    unverified: 'No sufficiently credible sources could confirm or deny this claim at this time.',
  };

  return {
    id: crypto.randomUUID(),
    contentType,
    inputLabel,
    claim:
      contentType === 'url'
        ? `Content at ${inputLabel}`
        : `Uploaded ${contentType}: ${inputLabel}`,
    verdict,
    confidence,
    summary: summaries[verdict],
    sources: [
      { name: 'Reuters Fact Check', url: '#', credibility: 0.95, stance: verdict === 'true' ? 'supports' : 'contradicts' },
      { name: 'AP Verification Desk', url: '#', credibility: 0.92, stance: verdict === 'true' ? 'supports' : 'contradicts' },
      { name: 'Independent domain analysis', url: '#', credibility: 0.71, stance: 'neutral' },
    ],
    createdAt: new Date().toISOString(),
  };
}

async function postToRealApi(
  endpoint: string,
  body: BodyInit,
  headers?: HeadersInit
): Promise<FactCheckResult> {
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    body,
    headers,
  });
  if (!response.ok) {
    throw new Error(`Analysis failed (${response.status})`);
  }
  return response.json();
}

export async function analyzeImage(file: File, onProgress?: StepCallback): Promise<FactCheckResult> {
  if (USE_MOCK) return runMockPipeline('image', file.name, onProgress);
  const formData = new FormData();
  formData.append('file', file);
  return postToRealApi('image', formData);
}

export async function analyzeVideo(file: File, onProgress?: StepCallback): Promise<FactCheckResult> {
  if (USE_MOCK) return runMockPipeline('video', file.name, onProgress);
  const formData = new FormData();
  formData.append('file', file);
  return postToRealApi('video', formData);
}

export async function analyzeUrl(url: string, onProgress?: StepCallback): Promise<FactCheckResult> {
  if (USE_MOCK) return runMockPipeline('url', url, onProgress);
  return postToRealApi('url', JSON.stringify({ url }), { 'Content-Type': 'application/json' });
}

const HISTORY_KEY = 'factcheck.history';

export function saveToHistory(result: FactCheckResult): void {
  const entry: HistoryEntry = {
    id: result.id,
    contentType: result.contentType,
    inputLabel: result.inputLabel,
    verdict: result.verdict,
    confidence: result.confidence,
    createdAt: result.createdAt,
  };
  const existing = getHistory();
  localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...existing].slice(0, 50)));
}

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
