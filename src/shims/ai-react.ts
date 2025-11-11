// Minimal shim for Vercel AI SDK 'ai/react' to unblock builds when package exports change.
// Provides a no-op useChat hook with the expected shape.
export function useChat(_options?: unknown) {
  return {
    messages: [] as Array<unknown>,
    input: '',
    handleInputChange: (_e: unknown) => {},
    handleSubmit: (_e: unknown) => {},
    isLoading: false,
    error: null as unknown,
    reload: () => {},
    stop: () => {},
  };
}

