import { generateEmbedding } from "@/lib/generate-local-embedding"

describe("generateEmbedding", () => {
  const createMock = jest.fn()
  const mockOpenAI = {
    embeddings: {
      create: createMock
    }
  } as any

  beforeEach(() => {
    createMock.mockReset()
  })

  it("returns embedding for a single input", async () => {
    createMock.mockResolvedValue({ data: [{ embedding: [1, 2, 3] }] })

    const result = await generateEmbedding(mockOpenAI, "hello")

    expect(result).toEqual([1, 2, 3])
    expect(createMock).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: ["hello"]
    })
  })

  it("returns embeddings for multiple inputs", async () => {
    createMock.mockResolvedValue({
      data: [
        { embedding: [1, 2, 3] },
        { embedding: [4, 5, 6] }
      ]
    })

    const result = await generateEmbedding(mockOpenAI, ["a", "b"])

    expect(result).toEqual([
      [1, 2, 3],
      [4, 5, 6]
    ])
    expect(createMock).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: ["a", "b"]
    })
  })
})
