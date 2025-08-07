export async function consumeReadableStream(
  stream: ReadableStream<Uint8Array>,
  callback: (chunk: string) => void,
  signal: AbortSignal
): Promise<void> {
  // Check if signal is already aborted
  if (signal.aborted) {
    console.log("Signal already aborted, skipping stream consumption")
    return
  }

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let isReaderReleased = false

  const abortHandler = () => {
    if (!isReaderReleased) {
      try {
        reader.cancel()
      } catch (error) {
        console.error("Error canceling reader:", error)
      }
    }
  }

  signal.addEventListener("abort", abortHandler, { once: true })

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      if (value) {
        callback(decoder.decode(value, { stream: true }))
      }
    }
  } catch (error) {
    if (signal.aborted) {
      console.error("Stream reading was aborted:", error)
    } else {
      console.error("Error consuming stream:", error)
    }
  } finally {
    isReaderReleased = true
    try {
      reader.releaseLock()
    } catch (error) {
      console.error("Error releasing reader lock:", error)
    }
  }
}
