'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Bell,
  Settings,
  User,
  HelpCircle,
  LogOut,
  ChevronDown,
  Command,
  X,
} from 'lucide-react';

import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

// Universal Search Component
function UniversalSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const router = useRouter();

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Simple search suggestions (can be enhanced with API calls)
  useEffect(() => {
    if (searchQuery.length > 0) {
      // Mock suggestions - replace with actual search API
      const mockSuggestions = [
        'Suppliers',
        'Inventory',
        'Products',
        'Customers',
        'Orders',
        'Analytics',
      ].filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));
      setSuggestions(mockSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const handleSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;

      // Route to search results page or trigger search
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
      setSearchQuery('');
    },
    [router]
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'relative h-9 w-full justify-start text-sm text-muted-foreground sm:w-48 sm:pr-8 md:w-64 lg:w-[500px]'
          )}
          onClick={() => setIsOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          <span>Search everything...</span>
          <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <Command className="h-3 w-3" />
            K
          </kbd>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search suppliers, products, inventory..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchQuery) {
                handleSearch(searchQuery);
              }
            }}
            className="border-0 focus-visible:ring-0"
            autoFocus
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="p-2">
            <div className="text-muted-foreground mb-1 px-2 text-xs font-medium">
              Quick Links
            </div>
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleSearch(suggestion)}
              >
                <Search className="mr-2 h-4 w-4" />
                {suggestion}
              </Button>
            ))}
          </div>
        )}
        {searchQuery && suggestions.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No results found. Press Enter to search for &quot;{searchQuery}&quot;
          </div>
        )}
        {!searchQuery && (
          <div className="p-4">
            <div className="text-muted-foreground mb-2 text-xs font-medium">
              Quick Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => router.push('/suppliers')}
              >
                View Suppliers
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => router.push('/inventory')}
              >
                View Inventory
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => router.push('/catalog')}
              >
                Browse Catalog
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => router.push('/analytics')}
              >
                View Analytics
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Notifications Component
function NotificationBell() {
  const [notificationCount, setNotificationCount] = useState(3); // Mock count

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="p-4 text-center text-sm text-muted-foreground">
          {notificationCount === 0 ? (
            'No new notifications'
          ) : (
            <>
              You have {notificationCount} new notification
              {notificationCount !== 1 ? 's' : ''}
            </>
          )}
        </div>
        {notificationCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="cursor-pointer">
                View all notifications
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// User Account Component
function UserAccount() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();

  const displayUser = user
    ? {
        name: user.name || user.email || 'User',
        email: user.email || '',
        avatar: user.profile_image || '/avatars/default.jpg',
      }
    : {
        name: 'Guest',
        email: '',
        avatar: '/avatars/default.jpg',
      };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/auth/login');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
            <AvatarFallback>{getInitials(displayUser.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[150px] truncate font-medium md:inline-block">
            {displayUser.name}
          </span>
          <ChevronDown className="hidden h-4 w-4 md:inline-block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5">
            <Avatar className="h-8 w-8">
              <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
              <AvatarFallback>{getInitials(displayUser.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayUser.name}</p>
              {displayUser.email && (
                <p className="text-xs leading-none text-muted-foreground">
                  {displayUser.email}
                </p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/account/profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/help">
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Support
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
          <LogOut className="mr-2 h-4 w-4" />
          {isLoading ? 'Logging out...' : 'Log out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Main Header Component
export function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 relative flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4">
      {/* Left: Sidebar & Title Section */}
      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        {title && (
          <>
            <span className="truncate font-semibold">{title}</span>
            {subtitle && (
              <>
                <span className="hidden text-muted-foreground sm:inline">/</span>
                <Link
                  href="/"
                  className="hidden text-muted-foreground hover:text-foreground truncate sm:inline"
                >
                  {subtitle}
                </Link>
              </>
            )}
          </>
        )}
      </div>

      {/* Center: Universal Search (Desktop) - Wider and Offset Left */}
      <div className="absolute left-[44%] top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
        <UniversalSearch />
      </div>

      {/* Right: Action Icons */}
      <div className="flex flex-1 items-center justify-end gap-1">
        {/* Mobile Search - shown when center search is hidden */}
        <div className="lg:hidden">
          <UniversalSearch />
        </div>

        {/* Settings */}
        <Button variant="ghost" size="icon" className="hidden sm:flex" asChild>
          <Link href="/settings">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User Account */}
        <UserAccount />
      </div>
    </header>
  );
}

