import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 设置一个定时器，在延迟时间后更新 debouncedValue
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 如果在延迟时间内 value 发生变化，清除上一个定时器，重新计时
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}