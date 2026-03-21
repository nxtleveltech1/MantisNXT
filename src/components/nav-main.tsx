'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Circle, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { buildClientXeroUrl, getClientXeroHeaders } from '@/lib/xero/client-org';

function normalizePath(path: string) {
  if (!path) return '/';
  const [base] = path.split('?');
  if (base === '/') return base;
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

/** Active when path equals this item or is under it (nested submenu parent row). */
function isNestedNavParentActive(
  path: string | null | undefined,
  subItem: { url: string; items?: { url: string }[] }
) {
  if (!path) return false;
  if (!subItem.items?.length) return normalizePath(path) === normalizePath(subItem.url);
  const nu = normalizePath(subItem.url);
  const pn = normalizePath(path);
  return pn === nu || pn.startsWith(`${nu}/`);
}

export function NavMain({
  items,
  label = 'Platform',
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      items?: {
        title: string;
        url: string;
      }[];
    }[];
  }[];
  label?: string | null;
}) {
  const pathname = usePathname();

  function XeroStatusIndicator() {
    const [status, setStatus] = useState<{ connected: boolean; tokenExpiring?: boolean } | null>(null);

    useEffect(() => {
      async function fetchStatus() {
        try {
          const response = await fetch(buildClientXeroUrl('/api/xero/connection'), {
            headers: getClientXeroHeaders(),
          });
          const contentType = response.headers.get('content-type') ?? '';
          const data = contentType.includes('application/json') ? await response.json().catch(() => null) : null;
          if (response.ok && data) {
            setStatus({
              connected: data.connected || false,
              tokenExpiring: data.connection?.tokenStatus?.isExpired || false,
            });
          }
        } catch {
          // Silent fail - do not show indicator if the status check fails.
        }
      }

      void fetchStatus();
      const interval = setInterval(fetchStatus, 5 * 60 * 1000);
      window.addEventListener('org-changed', fetchStatus);
      return () => {
        clearInterval(interval);
        window.removeEventListener('org-changed', fetchStatus);
      };
    }, []);

    if (!status) return null;

    const getStatusColor = () => {
      if (status.tokenExpiring) return 'text-yellow-500';
      if (status.connected) return 'text-green-500';
      return 'text-red-500';
    };

    return <Circle className={`h-2 w-2 fill-current ${getStatusColor()}`} />;
  }

  return (
    <SidebarGroup>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarMenu>
        {items.map((item) => {
          const isChildActive = item.items?.some(
            (subItem) => pathname?.startsWith(subItem.url) || subItem.items?.some((subSubItem) => pathname?.startsWith(subSubItem.url))
          );
          const isOpen = item.isActive || isChildActive;
          const hasSubItems = item.items && item.items.length > 0;

          if (!hasSubItems) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} isActive={pathname === item.url} asChild>
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible key={item.title} asChild defaultOpen={isOpen} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={pathname === item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const isSubChildActive = subItem.items?.some((subSubItem) => pathname?.startsWith(subSubItem.url));
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          {subItem.items?.length ? (
                            <Collapsible asChild defaultOpen={isSubChildActive} className="group/subcollapsible">
                              <div>
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuSubButton
                                    isActive={isNestedNavParentActive(pathname, subItem)}
                                  >
                                    <span>{subItem.title}</span>
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/subcollapsible:rotate-90" />
                                  </SidebarMenuSubButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <SidebarMenuSub>
                                    {subItem.items.map((subSubItem) => (
                                      <SidebarMenuSubItem key={subSubItem.title}>
                                        <SidebarMenuSubButton asChild isActive={pathname === subSubItem.url}>
                                          <Link href={subSubItem.url}>
                                            <span>{subSubItem.title}</span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    ))}
                                  </SidebarMenuSub>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          ) : (
                            <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                              <Link href={subItem.url} className="flex items-center gap-2">
                                <span>{subItem.title}</span>
                                {subItem.title === 'Xero Accounting' && <XeroStatusIndicator />}
                              </Link>
                            </SidebarMenuSubButton>
                          )}
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
