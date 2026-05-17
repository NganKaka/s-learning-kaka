import { ReactNode } from 'react';
import SiteNavbar from './SiteNavbar';
import SiteFooter from './SiteFooter';

interface PageShellProps {
  children: ReactNode;
  /** Hide footer for full-screen lesson player. */
  noFooter?: boolean;
}

export default function PageShell({ children, noFooter }: PageShellProps) {
  return (
    <div className="min-h-screen relative text-on-surface selection:bg-primary/30 selection:text-primary">
      <SiteNavbar />
      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-20">
        {children}
      </main>
      {!noFooter && (
        <div className="relative z-10">
          <SiteFooter />
        </div>
      )}
    </div>
  );
}
