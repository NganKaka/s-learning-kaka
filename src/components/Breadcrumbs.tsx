import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={10} className="text-secondary/30" />}
            {item.href ? (
              <Link to={item.href} className="hover:text-cyan-200 transition-colors">{item.label}</Link>
            ) : (
              <span className="text-on-surface">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
