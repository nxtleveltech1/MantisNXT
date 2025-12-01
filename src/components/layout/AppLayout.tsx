'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { sidebarData } from '@/components/app-sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { SectionQuickLinks } from '@/components/layout/SectionQuickLinks';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  showQuickLinks?: boolean;
}

const normalizePath = (path: string) => {
  if (!path) return '/';
  const [base] = path.split('?');
  if (base === '/') return base;
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

export const findSectionForPath = (pathname: string) => {
  const normalizedPath = normalizePath(pathname);
  let bestMatch: { item: (typeof sidebarData.navMain)[number]; score: number } | null = null;

  const registerMatch = (item: (typeof sidebarData.navMain)[number], url: string) => {
    const normalizedTarget = normalizePath(url);
    if (normalizedTarget === '/') {
      if (normalizedPath === '/') {
        bestMatch = { item, score: 1 };
      }
      return;
    }

    const isMatch =
      normalizedPath === normalizedTarget || normalizedPath.startsWith(`${normalizedTarget}/`);

    if (isMatch) {
      const score = normalizedTarget.length;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { item, score };
      }
    }
  };

  sidebarData.navMain.forEach(item => {
    registerMatch(item, item.url);
    item.items?.forEach(subItem => registerMatch(item, subItem.url));
  });

  return bestMatch?.item ?? null;
};

export default function AppLayout({
  children,
  title = 'MantisNXT Dashboard',
  breadcrumbs = [],
  showQuickLinks = true,
}: AppLayoutProps) {
  const pathname = usePathname();
  const currentSection = React.useMemo(
    () => (pathname ? findSectionForPath(pathname) : null),
    [pathname]
  );
  const quickLinks = currentSection?.items ?? [];

  // Build breadcrumb subtitle for AppHeader
  const breadcrumbSubtitle = React.useMemo(() => {
    if (breadcrumbs.length === 0) return undefined;
    return breadcrumbs.map(crumb => crumb.label).join(' / ');
  }, [breadcrumbs]);

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title={title} subtitle={breadcrumbSubtitle} />
        <div className="flex flex-1 flex-col gap-2 p-4 md:p-6 lg:p-8">
          {showQuickLinks && quickLinks.length > 0 ? (
            <div className="mb-0 flex justify-end">
              <SectionQuickLinks
                sectionTitle={currentSection?.title ?? title}
                links={quickLinks}
                activePath={pathname ?? ''}
                className="w-full justify-end gap-3"
              />
            </div>
          ) : null}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
