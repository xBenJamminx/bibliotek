import OpenAI from "openai"

/**
 * Generate embeddings for one or many inputs using a web/API-based provider.
 * @param openai - An initialized OpenAI client instance.
 * @param input - Text or array of texts to embed.
 * @returns The embedding vector(s) returned by the provider.
 */
export async function generateEmbedding(
  openai: OpenAI,
  input: string | string[]
): Promise<number[] | number[][]> {
  const inputs = Array.isArray(input) ? input : [input]

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: inputs
  })

  const embeddings = response.data.map(item => item.embedding as number[])
  return Array.isArray(input) ? embeddings : embeddings[0]
}
