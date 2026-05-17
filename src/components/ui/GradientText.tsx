import { motion } from 'framer-motion';

interface GradientTextProps {
  text: string;
  className?: string;
  colors?: string[];
}

export default function GradientText({
  text,
  className = '',
  colors = ['#e9c349', '#22d3ee', '#a855f7', '#e9c349'],
}: GradientTextProps) {
  const gradient = colors.join(', ');

  return (
    <motion.span
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${gradient})`,
        backgroundSize: '200% 100%',
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {text}
    </motion.span>
  );
}
