import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface AiInsightRequestBody {
  pathLabels: string[];
  hops: number;
  likelihoodPct: number;
  riskScore: number;
  weakestLinkCve: string;
  weakestLinkNode: string;
  weakestLinkCvss?: number;
  weakestLinkSoftware?: string;
  mitreTactics: string[];
  targetLabel: string;
  entryLabel: string;
}

function getGenAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length < 10) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.post('/api/ai-insight', async (req: Request, res: Response) => {
    const body = req.body as AiInsightRequestBody;
    if (!body || !Array.isArray(body.pathLabels) || body.pathLabels.length === 0) {
      res.status(400).json({ error: 'Invalid attack path payload.' });
      return;
    }

    const ai = getGenAiClient();
    if (!ai) {
      res.status(200).json({
        fallback: true,
        source: 'analytical',
      });
      return;
    }

    const prompt = [
      'You are advising the Chief Information Security Officer (CISO) of a global tier-1 bank.',
      'Write exactly 4 crisp, authoritative sentences explaining the selected attack path and the highest-leverage mitigation.',
      'Avoid bullet points, markdown formatting, or filler greetings.',
      `Entry Point: ${body.entryLabel}`,
      `Crown Jewel Target: ${body.targetLabel}`,
      `Attack Path (${body.hops} hops): ${body.pathLabels.join(' -> ')}`,
      `Path Likelihood: ${body.likelihoodPct.toFixed(2)}% | Path Risk Score: ${body.riskScore.toFixed(1)}/100`,
      `Weakest Link: ${body.weakestLinkCve} on ${body.weakestLinkNode}${body.weakestLinkCvss ? ` (CVSS ${body.weakestLinkCvss})` : ''}${body.weakestLinkSoftware ? ` affecting ${body.weakestLinkSoftware}` : ''}`,
      `MITRE ATT&CK Chain: ${body.mitreTactics.join(' -> ')}`,
    ].join('\n');

    try {
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
        });
      } catch (firstErr: unknown) {
        const msg = firstErr instanceof Error ? firstErr.message : '';
        if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
          await new Promise((r) => setTimeout(r, 500));
          response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: prompt,
          });
        } else {
          throw firstErr;
        }
      }

      const insight = response.text?.trim();
      if (!insight) {
        res.status(200).json({ fallback: true, source: 'analytical' });
        return;
      }

      res.json({ insight, source: 'gemini' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate AI insight.';
      console.warn('Gemini API fallback:', message);
      res.status(200).json({ fallback: true, source: 'analytical' });
    }
  });

  app.post('/api/ai-analyst', async (req: Request, res: Response) => {
    const body = req.body as {
      question?: string;
      twinContext?: Record<string, unknown>;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!body || typeof body.question !== 'string' || !body.question.trim()) {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }

    const ai = getGenAiClient();
    if (!ai) {
      res.status(200).json({ fallback: true, source: 'analytical' });
      return;
    }

    const historyText = (body.history ?? [])
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'User' : 'Analyst'}: ${m.content}`)
      .join('\n');

    const prompt = [
      'You are AtlasTwin AI Security Analyst advising a bank CISO and security operations team.',
      'Answer clearly, concisely, and factually using ONLY the live digital twin telemetry provided below.',
      'Avoid markdown headers or emojis; plain structured paragraphs or concise numbered items are ideal.',
      '',
      'LIVE DIGITAL TWIN STATE (JSON):',
      JSON.stringify(body.twinContext ?? {}, null, 2),
      historyText ? `\nRECENT CONVERSATION:\n${historyText}` : '',
      `\nCURRENT QUESTION: ${body.question.trim()}`,
    ].join('\n');

    try {
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
        });
      } catch (firstErr: unknown) {
        const msg = firstErr instanceof Error ? firstErr.message : '';
        if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
          await new Promise((r) => setTimeout(r, 500));
          response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: prompt,
          });
        } else {
          throw firstErr;
        }
      }

      const answer = response.text?.trim();
      if (!answer) {
        res.status(200).json({ fallback: true, source: 'analytical' });
        return;
      }

      res.json({ answer, source: 'gemini' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to query AI Analyst.';
      console.warn('Gemini Analyst fallback:', message);
      res.status(200).json({ fallback: true, source: 'analytical' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AtlasTwin server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AtlasTwin server:', err);
  process.exit(1);
});
