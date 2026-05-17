import { useEffect, useMemo, useState } from 'react';

export default function Typewriter({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[index] ?? '';
    const typingSpeed = deleting ? 70 : 130;

    const timeout = window.setTimeout(() => {
      if (!deleting) {
        setText(current.substring(0, text.length + 1));
        if (text === current) {
          window.setTimeout(() => setDeleting(true), 1800);
        }
      } else {
        setText(current.substring(0, text.length - 1));
        if (!text) {
          setDeleting(false);
          setIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, text === current ? 1800 : typingSpeed);

    return () => window.clearTimeout(timeout);
  }, [deleting, index, text, words]);

  const longest = useMemo(() => words.reduce((a, b) => (a.length > b.length ? a : b), ''), [words]);

  return (
    <span className="text-primary inline-grid relative">
      <span className="invisible pointer-events-none select-none col-start-1 row-start-1">{longest}</span>
      <span className="col-start-1 row-start-1 whitespace-nowrap">
        {text}
        <span className="animate-pulse inline-block ml-0.5">_</span>
      </span>
    </span>
  );
}
