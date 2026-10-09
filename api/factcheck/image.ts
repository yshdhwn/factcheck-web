// Vercel serverless function: POST /api/factcheck/image
// Body: { image: <base64 JPEG/PNG/WEBP>, mediaType: string, fileName?: string }
// Uses the Google Gemini API (free tier available).
// Environment variables (set in Vercel, never in frontend code):
//   GEMINI_API_KEY  (required)  – get one free at https://aistudio.google.com/apikey
//   GEMINI_MODEL    (optional)  – defaults to gemini-3.8-flash

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';

const PROMPT = `You are a careful image fact-checker. Examine the attached image and decide whether it appears authentic, fake/manipulated, misleading, or cannot be determined.

Return ONLY a JSON object (no markdown, no prose) with exactly this shape:
{
  "claim": string,
  "verdict": "true" | "false" | "misleading" | "unverified",
  "confidence": number,
  "summary": string,
  "reasons": [
    { "title": string, "detail": string, "stance": "indicates_fake" | "indicates_authentic" | "inconclusive" }
  ],
  "limitations": string
}

Rules:
- "claim": what the image presents or implies, in one sentence. "confidence": integer 0-100, be conservative. "summary": 2-3 plain sentences. "reasons": 3-8 specific observations, most important first.
- Every reason must refer to something actually visible in THIS image (text, fonts, alignment, security features, lighting, edges, compression artifacts, inconsistencies). Never invent details.
- If two items are shown for comparison, compare them feature by feature and say which one deviates.
- A photo alone often cannot prove authenticity. Use "unverified" with low confidence when the evidence is weak, rather than guessing.
- Do not state certainty you do not have.`;

type Req = { method?: string; body?: any };
type Res = { status: (n: number) => Res; json: (b: unknown) => void };

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY.' });

  const { image, mediaType, fileName } = req.body ?? {};
  if (typeof image !== 'string' || !['image/jpeg', 'image/png', 'image/webp'].includes(mediaType)) {
    return res.status(400).json({ error: 'Send { image: base64, mediaType: image/jpeg|png|webp }.' });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ inline_data: { mime_type: mediaType, data: image } }, { text: PROMPT }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
    });
  } catch {
    return res.status(502).json({ error: 'Could not reach the analysis service.' });
  }

  if (!upstream.ok) {
    let reason = '';
    try {
      reason = ((await upstream.json()) as any)?.error?.message ?? '';
    } catch {
      /* ignore */
    }
    const hint =
      upstream.status === 429 ? ' (free-tier rate limit reached, wait a minute and retry)' : '';
    return res
      .status(502)
      .json({ error: `Analysis service error (${upstream.status})${hint}${reason ? ': ' + reason : ''}` });
  }

  const payload: any = await upstream.json();
  const blocked = payload?.promptFeedback?.blockReason;
  if (blocked) {
    return res.status(422).json({ error: `The image was blocked by the safety filter (${blocked}).` });
  }

  const text: string = (payload?.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    .join('');

  let parsed: any;
  try {
    parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  } catch {
    return res.status(502).json({ error: 'The analysis returned an unreadable response. Try again.' });
  }

  const verdicts = ['true', 'false', 'misleading', 'unverified'];
  const stances = ['indicates_fake', 'indicates_authentic', 'inconclusive'];
  const reasons = (Array.isArray(parsed.reasons) ? parsed.reasons : [])
    .filter((r: any) => r && typeof r.title === 'string' && typeof r.detail === 'string')
    .map((r: any) => ({
      title: r.title,
      detail: r.detail,
      stance: stances.includes(r.stance) ? r.stance : 'inconclusive',
    }));

  return res.status(200).json({
    id: globalThis.crypto.randomUUID(),
    contentType: 'image',
    inputLabel: fileName ?? 'image',
    claim: String(parsed.claim ?? 'Uploaded image'),
    verdict: verdicts.includes(parsed.verdict) ? parsed.verdict : 'unverified',
    confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 50))),
    summary: String(parsed.summary ?? ''),
    reasons,
    limitations: typeof parsed.limitations === 'string' ? parsed.limitations : undefined,
    sources: [],
    createdAt: new Date().toISOString(),
  });
}