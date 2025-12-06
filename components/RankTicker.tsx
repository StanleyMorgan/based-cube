import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

const RankTicker = ({ from, to }: { from: number; to: number }) => {
  const count = useMotionValue(from);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    // Animate from old rank to new rank over 1.5 seconds
    const controls = animate(count, to, { duration: 1.5, ease: "circOut" });
    return controls.stop;
  }, [from, to]);

  return <motion.span>{rounded}</motion.span>;
};

export default RankTicker;