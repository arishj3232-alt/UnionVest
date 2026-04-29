import React from 'react';
import { motion, useInView, Variants } from 'framer-motion';

interface ScrollRevealProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  variant?: 'slideUp' | 'scale' | 'fade' | 'valentine';
  once?: boolean;
  threshold?: number;
  delay?: number;
}

const variants: Record<string, Variants> = {
  slideUp: {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  },
  scale: {
    hidden: {
      opacity: 0,
      scale: 0.92,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.45,
        ease: [0.34, 1.56, 0.64, 1], // Slight bounce
      },
    },
  },
  fade: {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  },
  valentine: {
    hidden: {
      opacity: 0,
      y: 25,
      scale: 0.95,
      rotate: -1,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.55,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  },
};

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  index = 0,
  className = '',
  variant = 'slideUp',
  once = true,
  threshold = 0.2,
  delay = 0,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once,
    amount: threshold,
    margin: '-50px 0px',
  });

  const staggerDelay = delay + index * 0.08;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants[variant]}
      className={className}
      style={{
        transitionDelay: `${staggerDelay}s`,
      }}
      custom={staggerDelay}
      transition={{
        delay: staggerDelay,
      }}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
