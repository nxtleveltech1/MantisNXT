import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

type SectionQuickLinksProps = {
  sectionTitle: string;
  links: {
    title: string;
    url: string;
  }[];
  activePath: string;
  className?: string;
};

const normalizePath = (path: string) => {
  if (!path) return '/';
  const [base] = path.split('?');
  if (base === '/') return base;
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

export function SectionQuickLinks({
  sectionTitle,
  links,
  activePath,
  className,
}: SectionQuickLinksProps) {
  if (!links?.length) return null;

  return (
    <div
      className={cn(
        'ml-auto flex flex-nowrap items-center gap-4 overflow-x-auto pb-2 md:pb-0',
        'justify-end',
        className
      )}
    >
      {links.map(link => {
        return (
          <Link
            key={`${link.title}-${link.url}`}
            href={link.url}
            className={cn(
              'inline-flex items-center justify-center gap-1 rounded-sm border px-2.5 py-2 text-[9px] leading-none font-medium tracking-normal whitespace-nowrap capitalize transition-all duration-300 ease-out',
              'border-red-900/50 bg-[radial-gradient(circle_at_20%_18%,rgba(180,60,60,0.7),rgba(120,30,30,0)_44%),radial-gradient(circle_at_82%_6%,rgba(160,50,50,0.4),rgba(100,20,20,0)_46%),linear-gradient(155deg,rgba(140,35,35,0.9),rgba(100,25,25,0.8),rgba(70,18,18,0.75))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),_0_16px_52px_-30px_rgba(0,0,0,0.5)] backdrop-blur-3xl hover:-translate-y-0.5 hover:border-red-800/60 hover:shadow-[0_20px_50px_-26px_rgba(0,0,0,0.6)]'
            )}
            aria-label={`${sectionTitle} - ${link.title}`}
          >
            <span className="text-[9px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
              {link.title}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
