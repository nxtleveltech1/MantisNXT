declare const Bun: {
  file(path: string): {
    text(): Promise<string>;
  };
};
