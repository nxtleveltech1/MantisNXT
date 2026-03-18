const originalWarn = console.warn.bind(console);
const baselinePattern = /\[baseline-browser-mapping\] The data in this module is over two months old/;

console.warn = (...args) => {
  if (typeof args[0] === 'string' && baselinePattern.test(args[0])) {
    return;
  }

  originalWarn(...args);
};
