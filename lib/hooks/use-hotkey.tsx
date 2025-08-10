import { useEffect } from "react"

// Uses Windows-style shortcuts: Ctrl + Shift + <key>
const useHotkey = (key: string, callback: () => void): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Windows-style: Ctrl + Shift + key (also works on Mac with Ctrl)
      if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key.toLowerCase() === key.toLowerCase()
      ) {
        event.preventDefault()
        callback()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [key, callback])
}

export default useHotkey
