export const MODEL = "claude-sonnet-4-20250514";

// Retry up to 3 times on 529 (overloaded) with exponential backoff: 2s, 4s, 8s.
const MAX_RETRIES = 3;

async function callClaude(apiKey, { messages, max_tokens, stream = false, temperature }) {
  const body = { model: MODEL, max_tokens, messages };
  if (temperature !== undefined) body.temperature = temperature;

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, stream }),
    });

    if (r.ok) return r;

    const status = r.status;
    const errText = await r.text();

    if (status === 529 && attempt < MAX_RETRIES) continue;

    if (status === 401) throw new Error("Invalid Anthropic API key. Check your key in Configuration.");
    if (status === 403) throw new Error("Anthropic API key has insufficient permissions.");
    if (status === 429) throw new Error("Anthropic rate limit reached. Wait a moment and try again.");
    if (status === 529) throw new Error("Anthropic API is overloaded after " + MAX_RETRIES + " retries. Please wait a minute and try again.");
    if (status === 500 || status === 502 || status === 503) throw new Error("Anthropic API server error (" + status + "). Try again in a moment.");
    throw new Error("Claude API => " + status + ": " + errText);
  }

  // Should be unreachable, but satisfies control-flow analysis.
  throw new Error("Anthropic API is overloaded. Please wait a minute and try again.");
}

export async function callClaudeStream(apiKey, params, onChunk) {
  const r = await callClaude(apiKey, { ...params, stream: true });
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const ev = JSON.parse(line.slice(6));
        if (ev.type === "content_block_delta" && ev.delta?.text) {
          full += ev.delta.text;
          onChunk(full);
        }
      } catch {}
    }
  }

  return full;
}

export async function callClaudeFull(apiKey, params) {
  const r = await callClaude(apiKey, { ...params, stream: false });
  const data = await r.json();
  return data.content?.map(b => b.text || "").join("") || "";
}
