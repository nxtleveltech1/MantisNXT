'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Shield, LogOut, User, ChevronDown } from 'lucide-react';
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
  /** When true, icon fills the tile and no label/sublabel is shown (gloss background kept). */
  iconOnly?: boolean;
}

function PortalButton({ icon, label, sublabel, onClick, delay = 0, iconOnly = false }: PortalButtonProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center gap-3 p-8 min-w-[180px] min-h-[160px]
        rounded-lg border border-white/20
        bg-black/60 text-white
        shadow-[0_2px_8px_rgba(0,0,0,0.2)]
        transition-colors duration-200
        hover:bg-black/70 hover:border-white/30"
      style={{
        animationDelay: `${delay}ms`,
        animation: 'fadeSlideUp 0.5s ease-out forwards',
        opacity: 0,
      }}
    >
      <div
        className={
          iconOnly
            ? 'absolute inset-0 z-10 rounded-lg overflow-hidden'
            : 'relative z-10'
        }
      >
        {icon}
      </div>
      {!iconOnly && (
        <div className="relative z-10 flex flex-col items-center gap-0.5">
          {sublabel && (
            <span className="text-xs text-white/70 font-medium">
              {sublabel}
            </span>
          )}
          <span className="text-sm font-semibold">
            {label}
          </span>
        </div>
      )}
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

        {/* Top Header Bar - Admin & User Account */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/system-admin')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-black/60 text-white/90 hover:bg-black/70 transition-colors duration-150"
              style={{ animation: 'fadeSlideUp 0.5s ease-out forwards', opacity: 0 }}
            >
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium hidden md:inline">Admin</span>
            </button>

            <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/20 bg-black/60 hover:bg-black/70 transition-colors duration-150 text-white">
                  <Avatar className="h-9 w-9 border border-white/20">
                    <AvatarImage src={user?.profile_image} alt={user?.name || 'User'} />
                    <AvatarFallback className="bg-white/10 text-white text-sm">
                      {user?.name ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">{user?.name || 'User'}</span>
                    <span className="text-xs text-white/70">{user?.email}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/70" />
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
              className="px-4 py-2 rounded-lg border border-white/20 bg-black/60 hover:bg-red-900/40 text-white transition-colors duration-150"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Log Out</span>
            </Button>
            </div>
          </div>
        </div>

        {/* Content Container - positioned in lower half below background logo */}
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-end px-4 pb-12">
          {/* Spacer to push content below the background logo */}
          <div className="flex-1 min-h-[40vh]" />
          
          <div
            className="flex flex-col items-center mb-4"
            style={{ animation: 'fadeSlideUp 0.5s ease-out forwards' }}
          >
            <p className="text-base text-white font-medium mb-1">
              NXT Level Tech
            </p>
            <p className="text-sm text-white/70 text-center max-w-md">
              AI Driven Supplier Business Management Platform
            </p>
          </div>

          {/* Portal Buttons */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            <PortalButton
              iconOnly
              icon={
                <Image
                  src="/images/NXTERP.jpg"
                  alt="ERP System Access"
                  fill
                  className="object-cover rounded-lg"
                  sizes="180px"
                />
              }
              label=""
              onClick={() => router.push('/')}
              delay={100}
            />
            
            <PortalButton
              iconOnly
              icon={
                <Image
                  src="/images/NXTPOS.jpg"
                  alt="POS"
                  fill
                  className="object-cover rounded-lg"
                  sizes="180px"
                />
              }
              label=""
              onClick={() => router.push('/pos-app')}
              delay={200}
            />
            
            <PortalButton
              iconOnly
              icon={
                <Image
                  src="/images/Marketplace.jpg"
                  alt="Marketplace"
                  fill
                  className="object-cover rounded-lg"
                  sizes="180px"
                />
              }
              label=""
              onClick={() => window.open('https://marketplace.nxtdotx.online/', '_blank')}
              delay={300}
            />

            <PortalButton
              iconOnly
              icon={
                <Image
                  src="/images/NXTSocialExtreme.jpg"
                  alt="Social Media Marketing"
                  fill
                  className="object-cover rounded-lg"
                  sizes="180px"
                />
              }
              label=""
              onClick={() => window.open('https://socialextreme.nxtdotx.online/', '_blank')}
              delay={375}
            />

            <PortalButton
              iconOnly
              icon={
                <Image
                  src="/images/NXT DIGITAL ENGAGE.jpg"
                  alt="Digital Engage"
                  fill
                  className="object-cover rounded-lg"
                  sizes="180px"
                />
              }
              label=""
              onClick={() => window.open('https://digital.nxtdotx.online/', '_blank')}
              delay={400}
            />

            <PortalButton
              iconOnly
              icon={
                <Image
                  src="/images/NXT STOCKPULSE.JPG"
                  alt="StockPulse"
                  fill
                  className="object-cover rounded-lg"
                  sizes="180px"
                />
              }
              label=""
              onClick={() => window.open('https://stocktake.nxtdotx.online/', '_blank')}
              delay={425}
            />

            <PortalButton
              iconOnly
              icon={
                <Image
                  src="/images/NXT TIMEPULSE.png"
                  alt="TimePulse"
                  fill
                  className="object-cover rounded-lg"
                  sizes="180px"
                />
              }
              label=""
              onClick={() => window.open('https://timepulse.nxtdotx.online/', '_blank')}
              delay={475}
            />

            <PortalButton
              iconOnly
              icon={
                <Image
                  src="/images/docustore.jpg"
                  alt="Document Store"
                  fill
                  className="object-cover rounded-lg"
                  sizes="180px"
                />
              }
              label=""
              onClick={() => router.push('/docustore')}
              delay={550}
            />
          </div>
        </div>
      </div>
    </>
  );
}

