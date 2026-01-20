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
  
  // Xero Status Indicator Component
  function XeroStatusIndicator() {
    const [status, setStatus] = useState<{ connected: boolean; tokenExpiring?: boolean } | null>(null);

    useEffect(() => {
      async function fetchStatus() {
        try {
          const response = await fetch('/api/xero/connection');
          if (response.ok) {
            const data = await response.json();
            setStatus({
              connected: data.connected || false,
              tokenExpiring: data.connection?.tokenStatus?.isExpired || false,
            });
          }
        } catch (error) {
          // Silent fail - don't show indicator if can't fetch
        }
      }
      fetchStatus();
      // Refresh every 5 minutes
      const interval = setInterval(fetchStatus, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }, []);

    if (!status) return null;

    const getStatusColor = () => {
      if (status.tokenExpiring) return 'text-yellow-500';
      if (status.connected) return 'text-green-500';
      return 'text-red-500';
    };

    return (
      <Circle className={`h-2 w-2 fill-current ${getStatusColor()}`} />
    );
  }

  return (
    <SidebarGroup>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarMenu>
        {items.map(item => {
          // Check if any child is active to keep parent open
          const isChildActive = item.items?.some(subItem =>
            pathname?.startsWith(subItem.url) ||
            subItem.items?.some(subSubItem => pathname?.startsWith(subSubItem.url))
          );
          const isOpen = item.isActive || isChildActive;
          const hasSubItems = item.items && item.items.length > 0;

          // If no sub-items, render as direct link
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

          // Has sub-items, render as collapsible
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
                    {item.items?.map(subItem => {
                      const isSubChildActive = subItem.items?.some(subSubItem => pathname?.startsWith(subSubItem.url));
                      // If it has sub-items, we need to check if we should keep IT open too
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          {subItem.items?.length ? (
                            <Collapsible asChild defaultOpen={isSubChildActive} className="group/subcollapsible">
                              <div>
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuSubButton isActive={pathname === subItem.url}>
                                    <span>{subItem.title}</span>
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/subcollapsible:rotate-90" />
                                  </SidebarMenuSubButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <SidebarMenuSub>
                                    {subItem.items.map(subSubItem => (
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
                                {subItem.title === 'Xero Accounting' && (
                                  <XeroStatusIndicator />
                                )}
                              </Link>
                            </SidebarMenuSubButton>
                          )}
                        </SidebarMenuSubItem>
                      )
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
