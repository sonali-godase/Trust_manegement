import React, { useEffect, useState } from 'react';

const AnimatedCounter = ({ value = 0, prefix = '', duration = 1000 }) => {
  const targetValue = Number(value) || 0;
  const [count, setCount] = useState(targetValue);

  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) {
      setCount(0);
      return;
    }
    let startTimestamp = null;
    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * target));
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return (
    <span className="notranslate" translate="no">
      {prefix}
      {count.toLocaleString('en-IN')}
    </span>
  );
};

export default AnimatedCounter;
