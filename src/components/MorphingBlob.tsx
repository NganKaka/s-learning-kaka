interface MorphingBlobProps {
  className?: string;
  color?: string;
  size?: number;
  duration?: number;
}

/**
 * Static blob shape rendered as a blurred SVG. Previously animated through
 * a setInterval + setState loop, but the result was barely visible under
 * `blur(40px)` and the rerender cost wasn't worth it.
 */
const BLOB_PATH =
  'M44.6,-77.1C56.5,-69.6,63.5,-54.6,69.5,-40.1C75.5,-25.6,80.5,-11.6,79.5,2C78.5,15.6,71.5,28.7,62.5,40.4C53.5,52.1,42.5,62.4,29.5,69.5C16.5,76.6,1.5,80.5,-13.7,78.6C-28.9,76.7,-44.3,69,-56.4,58.2C-68.5,47.4,-77.3,33.5,-80.5,18.3C-83.7,3.1,-81.3,-13.4,-74.7,-27.6C-68.1,-41.8,-57.3,-53.7,-44.6,-61.3C-31.9,-68.9,-17.3,-72.2,-1.4,-70C14.5,-67.8,29,-60.1,44.6,-77.1Z';

export default function MorphingBlob({
  className = '',
  color = 'rgba(233, 195, 73, 0.15)',
  size = 400,
}: MorphingBlobProps) {
  return (
    <div className={`absolute pointer-events-none ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="-100 -100 200 200"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{ filter: 'blur(40px)' }}
      >
        <path fill={color} d={BLOB_PATH} />
      </svg>
    </div>
  );
}
