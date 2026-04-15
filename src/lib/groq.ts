export async function generateContent(prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set in the environment variables.");

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant", // Defaulting back to the most stable Groq model
      messages,
      temperature: 0.2, // Low temperature for factual/SQL generation
    }),
  });

  if (!response.ok) {
     const text = await response.text();
     throw new Error(`Groq API Error: ${text}`);
  }

  const data = await response.json();
  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message.content;
  }
  throw new Error("Invalid response from Groq API");
}
