import Link from 'next/link';

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

/** Longest matching prefix among links (exact or path under link). */
function resolveActiveLinkUrl(
  links: SectionQuickLinksProps['links'],
  activePath: string
): string | null {
  const normPath = normalizePath(activePath);
  let best: { norm: string; raw: string } | null = null;
  for (const link of links) {
    const normLink = normalizePath(link.url);
    const matches = normPath === normLink || normPath.startsWith(`${normLink}/`);
    if (!matches) continue;
    if (!best || normLink.length > best.norm.length) {
      best = { norm: normLink, raw: link.url };
    }
  }
  return best?.raw ?? null;
}

export function SectionQuickLinks({
  sectionTitle,
  links,
  activePath,
  className,
}: SectionQuickLinksProps) {
  if (!links?.length) return null;

  const activeLinkUrl = resolveActiveLinkUrl(links, activePath);

  return (
    <div
      className={cn(
        'ml-auto flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 md:pb-0',
        'justify-end',
        className
      )}
    >
      {links.map(link => {
        const isActive =
          activeLinkUrl != null && normalizePath(link.url) === normalizePath(activeLinkUrl);
        return (
          <Link
            key={`${link.title}-${link.url}`}
            href={link.url}
            className={cn(
              'inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-150',
              'border-border bg-muted/50 text-foreground hover:bg-muted hover:text-foreground',
              isActive && 'border-border bg-muted text-foreground'
            )}
            aria-label={`${sectionTitle} - ${link.title}`}
          >
            {link.title}
          </Link>
        );
      })}
    </div>
  );
}
