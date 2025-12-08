'use client';

import { useEffect, useState } from 'react';

type DynamicTextWrapperProps = {
  texts: string[];
  interval?: number;
  className?: string;
};

const DynamicTextWrapper = ({ texts, interval = 2500, className }: DynamicTextWrapperProps) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (texts.length <= 1) return undefined;

    const timer = setInterval(() => {
      setIndex(current => (current + 1) % texts.length);
    }, Math.max(interval, 500));

    return () => clearInterval(timer);
  }, [texts, interval]);

  return <span className={className}>{texts[index] ?? ''}</span>;
};

export default DynamicTextWrapper;
