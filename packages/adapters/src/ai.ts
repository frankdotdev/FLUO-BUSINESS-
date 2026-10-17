// Pluggable AI provider adapter for catalogue extraction, merchant assistants, and smart dispatch.
// Isolated in its own file to maintain strict modularity.

export interface AiChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface AiProviderConfig {
  readonly apiKey?: string;
  readonly model?: string;
  readonly baseUrl?: string;
}

export interface ParsedItem {
  readonly name: string;
  readonly description: string;
  readonly priceMinor: bigint;
  readonly category: string;
}

export interface AiProvider {
  chat(messages: readonly AiChatMessage[]): Promise<string>;
  extractCatalogueItems(rawText: string): Promise<ParsedItem[]>;
}

export function createOpenAiCompatibleAiProvider(config: AiProviderConfig): AiProvider {
  const baseUrl = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = config.model ?? "gpt-4o-mini";

  return {
    async chat(messages: readonly AiChatMessage[]): Promise<string> {
      if (!config.apiKey) throw new Error("ai_api_key_missing");
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`ai_request_failed: ${res.status} ${errText}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    },

    async extractCatalogueItems(rawText: string): Promise<ParsedItem[]> {
      if (!config.apiKey) {
        // Fallback mock parser for dev/testing when API key is not configured
        return [
          {
            name: rawText.slice(0, 40).trim() || "Item",
            description: "Extracted from text",
            priceMinor: 100000n, // N1,000
            category: "General",
          },
        ];
      }

      const prompt = `Extract all products or services with prices from the following text as a JSON array with properties 'name' (string), 'description' (string), 'priceMinor' (integer in kobo/minor currency units, e.g. 1000 Naira = 100000), 'category' (string). Return ONLY JSON.\n\nText:\n${rawText}`;
      const res = await this.chat([
        { role: "system", content: "You are an expert commerce assistant that parses product menus and price lists." },
        { role: "user", content: prompt },
      ]);

      try {
        const cleaned = res.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          return parsed.map((p) => ({
            name: String(p.name || "Item"),
            description: String(p.description || ""),
            priceMinor: BigInt(p.priceMinor || 0),
            category: String(p.category || "General"),
          }));
        }
      } catch {
        // ignore parse error and return empty array
      }
      return [];
    },
  };
}
