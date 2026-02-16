'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, ShoppingCart, Handshake, Shield, LogOut, User, ChevronDown, FileText, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PortalButtonProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  delay?: number;
}

function PortalButton({ icon, label, sublabel, onClick, delay = 0 }: PortalButtonProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center gap-3 p-8 min-w-[180px] min-h-[160px]
        rounded-2xl border border-white/10 
        bg-gradient-to-b from-white/10 to-white/5
        backdrop-blur-xl shadow-2xl
        transition-all duration-500 ease-out
        hover:scale-105 hover:border-white/25 hover:from-white/15 hover:to-white/10
        hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]
        active:scale-95"
      style={{
        animationDelay: `${delay}ms`,
        animation: 'fadeSlideUp 0.8s ease-out forwards',
        opacity: 0,
      }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-red-500/0 to-red-500/0 
        group-hover:from-red-500/10 group-hover:to-transparent transition-all duration-500" />
      
      {/* Reflection line at top */}
      <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      
      {/* Icon */}
      <div className="relative z-10 text-white/90 group-hover:text-white transition-colors duration-300">
        {icon}
      </div>
      
      {/* Label */}
      <div className="relative z-10 flex flex-col items-center gap-0.5">
        {sublabel && (
          <span className="text-xs text-white/60 uppercase tracking-wider font-medium">
            {sublabel}
          </span>
        )}
        <span className="text-sm font-semibold text-white uppercase tracking-widest">
          {label}
        </span>
      </div>
    </button>
  );
}

export default function PortalPage() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.4));
          }
          50% {
            filter: drop-shadow(0 0 40px rgba(239, 68, 68, 0.6));
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
      
      <div className="relative min-h-screen overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/images/portal-background.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          {/* Subtle vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
        </div>

        {/* Top Header Bar - User Account & Logout */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6">
          <div className="flex items-center justify-end gap-3">
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl hover:bg-black/60 transition-all">
                  <Avatar className="h-9 w-9 border border-white/20">
                    <AvatarImage src={user?.profile_image} alt={user?.name || 'User'} />
                    <AvatarFallback className="bg-red-900/50 text-white text-sm">
                      {user?.name ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium text-white">{user?.name || 'User'}</span>
                    <span className="text-xs text-white/60">{user?.email}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.name || 'User'}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/account/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/account/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Logout Button */}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl hover:bg-red-900/50 hover:border-red-800/50 text-white transition-all"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Log Out</span>
            </Button>
          </div>
        </div>

        {/* Content Container - positioned in lower half below background logo */}
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-end px-4 pb-12">
          {/* Spacer to push content below the background logo */}
          <div className="flex-1 min-h-[40vh]" />
          
          {/* Branding Section - Tagline only, logo is in background */}
          <div 
            className="flex flex-col items-center mb-4"
            style={{
              animation: 'fadeSlideUp 0.6s ease-out forwards',
            }}
          >
            {/* Subtitle */}
            <p className="text-lg text-white/80 tracking-[0.3em] uppercase mb-2">
              NXT Level Tech
            </p>
            
            {/* Tagline */}
            <p className="text-sm text-white/60 tracking-[0.2em] uppercase text-center max-w-md">
              AI Driven Supplier Business Management Platform
            </p>
          </div>

          {/* Portal Buttons */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            <PortalButton
              icon={<Settings className="h-10 w-10" strokeWidth={1.5} />}
              sublabel="ERP System"
              label="Access"
              onClick={() => router.push('/')}
              delay={100}
            />
            
            <PortalButton
              icon={<ShoppingCart className="h-10 w-10" strokeWidth={1.5} />}
              label="POS"
              onClick={() => router.push('/pos-app')}
              delay={200}
            />
            
            <PortalButton
              icon={<Handshake className="h-10 w-10" strokeWidth={1.5} />}
              label="Marketplace"
              onClick={() => router.push('/marketplace-app')}
              delay={300}
            />

            <PortalButton
              icon={<MessageSquare className="h-10 w-10" strokeWidth={1.5} />}
              sublabel="WhatsApp"
              label="Sales Channel"
              onClick={() => router.push('/marketing-app')}
              delay={350}
            />

            <PortalButton
              icon={
                <Image
                  src="/images/social-media-marketing-icon.png"
                  alt="Social Media Marketing"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              }
              sublabel="Social Media"
              label="Marketing"
              onClick={() => router.push('/social-media-app')}
              delay={375}
            />

            <PortalButton
              icon={<Shield className="h-10 w-10" strokeWidth={1.5} />}
              sublabel="System"
              label="Administration"
              onClick={() => router.push('/system-admin')}
              delay={400}
            />
            
            <PortalButton
              icon={<FileText className="h-10 w-10" strokeWidth={1.5} />}
              sublabel="Document"
              label="Store"
              onClick={() => router.push('/docustore')}
              delay={500}
            />
          </div>

          {/* Subtle footer sparkle */}
          <div className="absolute bottom-8 right-8">
            <svg 
              className="w-6 h-6 text-white/40"
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M12 2L13.09 8.26L19 7L14.14 11.14L20 16L13.09 14.09L12 22L10.91 14.09L4 16L9.86 11.14L5 7L10.91 8.26L12 2Z" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}

