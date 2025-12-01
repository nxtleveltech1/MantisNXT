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

  const normalizedActive = normalizePath(activePath);

  // Find the best matching link (longest URL that is a prefix of current path)
  const activeLinkUrl = links.reduce((best, link) => {
    const target = normalizePath(link.url);
    if (normalizedActive === target || normalizedActive.startsWith(`${target}/`)) {
      if (!best || target.length > best.length) {
        return target;
      }
    }
    return best;
  }, '');

  return (
    <div
      className={cn(
        'flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 md:pb-0',
        'w-full justify-end',
        className
      )}
    >
      {links.map(link => {
        const normalizedTarget = normalizePath(link.url);
        const isActive = normalizedTarget === activeLinkUrl;

        return (
          <Link
            key={`${link.title}-${link.url}`}
            href={link.url}
            className={cn(
              'inline-flex min-w-[122px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-[10px] leading-none font-semibold tracking-[0.14em] whitespace-nowrap uppercase transition-all duration-300 ease-out',
              'shadow-[0_18px_44px_-24px_rgba(0,0,0,0.45)] backdrop-blur-3xl hover:-translate-y-0.5',
              isActive
                ? 'border-white/42 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.56),rgba(255,255,255,0)_44%),radial-gradient(circle_at_82%_6%,rgba(255,255,255,0.26),rgba(255,255,255,0)_46%),linear-gradient(155deg,rgba(210,218,226,0.82),rgba(165,175,185,0.72),rgba(125,135,145,0.64))] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),_0_20px_60px_-34px_rgba(0,0,0,0.52)]'
                : 'border-white/30 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.54),rgba(255,255,255,0)_44%),radial-gradient(circle_at_82%_6%,rgba(255,255,255,0.22),rgba(255,255,255,0)_46%),linear-gradient(155deg,rgba(236,240,244,0.72),rgba(205,214,224,0.52),rgba(178,187,197,0.4))] text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.74),_0_16px_52px_-30px_rgba(0,0,0,0.48)] hover:border-white/46 hover:shadow-[0_20px_50px_-26px_rgba(0,0,0,0.52)]'
            )}
            aria-label={`${sectionTitle} - ${link.title}`}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full bg-slate-800/72 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2),_0_0_10px_rgba(255,255,255,0.5)]',
                  isActive &&
                    'bg-slate-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.28),_0_0_12px_rgba(255,255,255,0.55)]'
                )}
              />
              <span
                className={cn(
                  'drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] transition-colors',
                  isActive ? 'text-slate-900' : 'text-slate-800'
                )}
              >
                {link.title}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
