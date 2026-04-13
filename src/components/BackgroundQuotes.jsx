import React, { useMemo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const QuoteItem = ({ text, style, parallaxSpeed }) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, parallaxSpeed * 500]);

  return (
    <motion.div
      style={{
        ...style,
        y,
        position: 'fixed',
        zIndex: 0,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: style.opacity || 1,
        y: [0, -15, 0],
      }}
      transition={{
        opacity: { duration: 2 },
        y: {
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
      className={`font-black tracking-tighter uppercase select-none ${style.className}`}
    >
      {text}
    </motion.div>
  );
};

const BackgroundQuotes = () => {
  const quotesData = useMemo(() => [
    {
      text: "IF YOU CAN’T ACCEPT LOSING YOU CAN’T WIN",
      parallaxSpeed: -0.1,
      style: {
        top: '15%',
        left: '5%',
        fontSize: 'clamp(1rem, 6vw, 4rem)',
        className: 'quote-watermark',
        opacity: 0.03
      }
    },
    {
      text: "A MISTAKE IS A LESSON FOR AN ENTIRE LIFE",
      parallaxSpeed: 0.15,
      style: {
        top: '65%',
        right: '10%',
        fontSize: 'clamp(0.7rem, 2vw, 1.5rem)',
        className: 'quote-gold font-mono',
        opacity: 0.4
      }
    },
    {
      text: "THE PAIN OF DISCIPLINE IS FAR LESS THAN THE PAIN OF REGRET",
      parallaxSpeed: -0.2,
      style: {
        top: '40%',
        left: '15%',
        fontSize: 'clamp(1rem, 4vw, 2.5rem)',
        className: 'quote-red',
        opacity: 0.15
      }
    },
    {
      text: "FOCUS ON THE PROCESS NOT ON THE OUTCOME.",
      parallaxSpeed: 0.05,
      style: {
        top: '80%',
        left: '20%',
        fontSize: 'clamp(0.6rem, 1.5vw, 1rem)',
        className: 'quote-gold font-mono tracking-[0.5em]',
        opacity: 0.1
      }
    },
    {
      text: "I’m only rich because I know when I’m wrong.",
      parallaxSpeed: 0.1,
      style: {
        top: '10%',
        right: '5%',
        fontSize: 'clamp(2rem, 10vw, 8rem)',
        className: 'quote-watermark italic',
        opacity: 0.02
      }
    }
  ], []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {quotesData.map((quote, idx) => (
        <QuoteItem key={idx} {...quote} />
      ))}
    </div>
  );
};

export default BackgroundQuotes;
