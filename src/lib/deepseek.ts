// DeepSeek API wrapper (OpenAI-compatible chat endpoint)
// Set VITE_DEEPSEEK_API_KEY in your .env for production use.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chatDeepSeek(messages: ChatMessage[], opts?: { model?: string; max_tokens?: number }): Promise<string> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined;
  if (!apiKey) throw new Error("Missing VITE_DEEPSEEK_API_KEY");

  const model = opts?.model ?? "deepseek-chat"; // DeepSeek v3 compatible alias
  const resp = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: opts?.max_tokens ?? 512,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`DeepSeek error: ${resp.status} ${text}`);
  }
  const json = await resp.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from DeepSeek");
  return content as string;
}
