'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { useAuth } from '@/lib/auth/auth-context';
import { loginFormSchema, type LoginFormData } from '@/lib/auth/validation';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const router = useRouter();
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  const form = useForm<LoginFormData, unknown, LoginFormData>({
    resolver: zodResolver(loginFormSchema) as Resolver<LoginFormData, unknown, LoginFormData>,
    defaultValues: {
      email: '',
      password: '',
      remember_me: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn({
        email: data.email,
        password: data.password,
        remember_me: data.remember_me,
        two_factor_code: requiresTwoFactor ? twoFactorCode : undefined,
      });

      if (result.success && result.user) {
        // Small delay to ensure auth state is updated
        setTimeout(() => {
          router.push('/');
        }, 100);
      } else if (result.requires_two_factor) {
        setRequiresTwoFactor(true);
        setTwoFactorToken(result.two_factor_token!);
        setError(null);
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async () => {
    if (!twoFactorToken || !twoFactorCode) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = form.getValues();
      const result = await signIn({
        email: data.email,
        password: data.password,
        remember_me: data.remember_me,
        two_factor_code: twoFactorCode,
      });

      if (result.success && result.user) {
        // Small delay to ensure auth state is updated
        setTimeout(() => {
          router.push('/');
        }, 100);
      } else {
        setError(result.message || 'Invalid verification code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-900"></div>
      </div>
    );
  }

  if (requiresTwoFactor) {
    return (
      <div className="relative min-h-screen">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-red-950 via-black to-red-900">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/images/login-background.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Content - Two Factor Form at bottom center */}
        <div
          className="z-10 max-w-md px-4"
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '28rem',
          }}
        >
          <div className="space-y-6 rounded-lg border border-red-900/50 bg-black/60 p-6 backdrop-blur-sm">
            {error && (
              <Alert variant="destructive" className="rounded-lg border-red-700 bg-red-900/90">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-white">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Input
                id="twoFactorCode"
                type="text"
                placeholder="000000"
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value)}
                maxLength={6}
                className="h-12 rounded-lg border-red-700/50 bg-red-900/30 text-center text-lg tracking-widest text-white placeholder:text-white/60"
                aria-label="Enter 6-digit verification code"
                autoComplete="one-time-code"
              />
            </div>

            <Button
              onClick={handleTwoFactorSubmit}
              disabled={isLoading || twoFactorCode.length !== 6}
              className="h-12 w-full rounded-lg bg-red-900 font-medium text-white hover:bg-red-800"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => {
                  setRequiresTwoFactor(false);
                  setTwoFactorToken(null);
                  setTwoFactorCode('');
                  setError(null);
                }}
                className="text-sm text-white/80 hover:text-white"
              >
                Back to login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-red-950 via-black to-red-900">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/images/login-background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content - Login Form at bottom center */}
      <div
        className="z-10 max-w-md px-4"
        style={{
          position: 'fixed',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '28rem',
        }}
      >
        {/* Login Form - Dark semi-transparent panel */}
        <div className="space-y-6 rounded-lg border border-red-900/50 bg-black/60 p-6 backdrop-blur-sm">
          {error && (
            <Alert variant="destructive" className="rounded-lg border-red-700 bg-red-900/90">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-white">{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Username or Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Username or Email"
                        className="h-12 rounded-lg border-red-700/50 bg-red-900/30 text-white placeholder:text-white/60"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-300" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          className="h-12 rounded-lg border-red-700/50 bg-red-900/30 pr-12 text-white placeholder:text-white/60"
                          autoComplete="current-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1/2 right-1 h-10 w-10 -translate-y-1/2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-white/60" />
                          ) : (
                            <Eye className="h-4 w-4 text-white/60" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-300" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full rounded-lg bg-red-900 font-medium text-white hover:bg-red-800"
              >
                {isLoading ? (
                  'Signing in...'
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Login
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
