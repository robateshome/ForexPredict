import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedPriceProps {
  price: number;
  previousPrice?: number;
  decimals?: number;
  className?: string;
}

export function AnimatedPrice({ price, previousPrice, decimals = 5, className = "" }: AnimatedPriceProps) {
  const [displayPrice, setDisplayPrice] = useState(price);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');

  useEffect(() => {
    if (previousPrice !== undefined && previousPrice !== price) {
      if (price > previousPrice) {
        setPriceDirection('up');
      } else if (price < previousPrice) {
        setPriceDirection('down');
      }
      
      // Reset direction after animation
      const timer = setTimeout(() => setPriceDirection('neutral'), 1000);
      return () => clearTimeout(timer);
    }
    
    setDisplayPrice(price);
  }, [price, previousPrice]);

  const getColorClass = () => {
    switch (priceDirection) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-white';
    }
  };

  return (
    <motion.span
      className={`font-mono transition-colors duration-300 ${getColorClass()} ${className}`}
      animate={{
        scale: priceDirection !== 'neutral' ? [1, 1.05, 1] : 1,
      }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={displayPrice}
          initial={{ opacity: 0, y: priceDirection === 'up' ? 10 : priceDirection === 'down' ? -10 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: priceDirection === 'up' ? -10 : priceDirection === 'down' ? 10 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {displayPrice.toFixed(decimals)}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

interface AnimatedChangeProps {
  change: number;
  changePercent: number;
  className?: string;
}

export function AnimatedChange({ change, changePercent, className = "" }: AnimatedChangeProps) {
  const isPositive = change >= 0;
  
  return (
    <motion.div
      className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'} ${className}`}
      animate={{
        scale: [1, 1.1, 1],
      }}
      transition={{ duration: 0.3 }}
      key={`${change}-${changePercent}`}
    >
      <span className="font-mono">
        {isPositive ? '+' : ''}{change.toFixed(5)}
      </span>
      <span className="ml-1">
        ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
      </span>
    </motion.div>
  );
}