// Minimal shim for Vercel AI SDK 'ai/react' to unblock builds when package exports change.
// Provides a no-op useChat hook with the expected shape.
export function useChat(options?: any) {
  return {
    messages: [] as Array<any>,
    input: '',
    handleInputChange: (_e: any) => {},
    handleSubmit: (_e: any) => {},
    isLoading: false,
    error: null as any,
    reload: () => {},
    stop: () => {},
  };
}

