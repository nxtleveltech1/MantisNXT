'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowLeft, Construction } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';

export default function SystemAdminPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image - Same as portal */}
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
        {/* Darker overlay for placeholder state */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content - positioned in lower half below background logo */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-end px-4 pb-16">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/portal')}
          className="absolute top-6 left-6 text-white/70 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Portal
        </Button>

        {/* Spacer to push content below the background logo */}
        <div className="flex-1 min-h-[40vh]" />

        {/* Placeholder Content */}
        <div className="flex flex-col items-center text-center max-w-lg">
          {/* Icon */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
            <div className="relative p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <Shield className="h-16 w-16 text-white" strokeWidth={1.5} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-wide">
            System Administration
          </h1>

          {/* Coming Soon Badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 mb-6">
            <Construction className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400 uppercase tracking-wider">
              Coming Soon
            </span>
          </div>

          {/* Description */}
          <p className="text-white/60 text-lg leading-relaxed mb-8">
            The NXT DOT-X System Administration panel provides centralized control 
            over platform settings, user management, security policies, and 
            system-wide configurations for enterprise deployments.
          </p>

          {/* Feature Preview */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            {['User Management', 'Security Policies', 'System Config', 'Audit Logs'].map((feature) => (
              <div 
                key={feature}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm"
              >
                <span className="text-sm text-white/70">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

