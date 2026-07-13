import Anthropic from 'npm:@anthropic-ai/sdk';
import { MODEL, parseAiJson } from './prompts.ts';

export function isAiEnabled(): boolean {
  return Boolean(Deno.env.get('ANTHROPIC_API_KEY'));
}

export async function callClaude(system: string, userContent: string): Promise<string | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.warn('[AI] ANTHROPIC_API_KEY not set — skipping Claude call');
    return null;
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system,
      messages: [{ role: 'user', content: userContent }],
    });

    const block = message.content[0];
    return block.type === 'text' ? block.text : null;
  } catch (err) {
    console.warn('[AI] Claude call failed:', err);
    return null;
  }
}

export { parseAiJson };
