import Ajv from 'ajv';
import { NextResponse } from 'next/server';
import { planSchema, type GeneratedPlan } from '@/lib/plan-schema';

export const runtime = 'nodejs';

const ajv = new Ajv({ allErrors: true });
const validatePlan = ajv.compile(planSchema);

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const modelAliases: Record<string, string> = {
  'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929',
};

const CLAUDE_MODEL = modelAliases[process.env.CLAUDE_MODEL || ''] || process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';

type GeneratePlanRequest = {
  mode?: 'create' | 'adjust';
  kind?: 'goal' | 'habit';
  title?: string;
  description?: string;
  current?: string;
  endDate?: string;
  dailyTime?: number;
  existingPlan?: unknown;
};

const clampDays = (endDate?: string) => {
  if (!endDate) return 7;
  const now = new Date();
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return 7;
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
  return Math.min(Math.max(diff, 1), 60);
};

const buildPrompt = (input: GeneratePlanRequest) => {
  const dayCount = clampDays(input.endDate);
  const kindLabel = input.kind === 'habit' ? 'habit-building plan' : 'goal plan';
  const modeLabel = input.mode === 'adjust' ? 'adjust the existing plan' : 'create a new plan';

  return [
    `You are an AI coach for a Chinese daily planning app. ${modeLabel}.`,
    `Plan type: ${kindLabel}`,
    `Title: ${input.title || 'Untitled'}`,
    `Description: ${input.description || 'No description provided'}`,
    `Current baseline: ${input.current || 'Unknown'}`,
    `Deadline: ${input.endDate || 'Not specified'}`,
    `Daily time budget: ${input.dailyTime || 60} minutes`,
    `Return exactly ${dayCount} days unless the plan is impossible.`,
    'Write all user-facing text in Simplified Chinese.',
    'Each day should be concrete, small enough to finish, and include 2-4 practical tasks.',
    input.existingPlan ? `Existing plan to adjust:\n${JSON.stringify(input.existingPlan).slice(0, 6000)}` : '',
  ].filter(Boolean).join('\n');
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY in Railway variables.' }, { status: 500 });
  }

  const input = (await request.json()) as GeneratePlanRequest;
  if (!input.kind || !input.title?.trim()) {
    return NextResponse.json({ error: 'kind and title are required.' }, { status: 400 });
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: buildPrompt(input) }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: planSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    let readableDetail = detail;
    try {
      const parsed = JSON.parse(detail);
      readableDetail = parsed?.error?.message || parsed?.message || detail;
    } catch {
      readableDetail = detail;
    }
    return NextResponse.json({ error: 'Claude API request failed.', detail: readableDetail }, { status: response.status });
  }

  const result = await response.json();
  const text = result?.content?.find((block: any) => block.type === 'text')?.text;
  if (!text) {
    return NextResponse.json({ error: 'Claude returned no text content.' }, { status: 502 });
  }

  let plan: GeneratedPlan;
  try {
    plan = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Claude returned invalid JSON.' }, { status: 502 });
  }

  if (!validatePlan(plan)) {
    return NextResponse.json(
      { error: 'Claude output failed JSON Schema validation.', details: validatePlan.errors },
      { status: 502 },
    );
  }

  return NextResponse.json({ plan });
}
