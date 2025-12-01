'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { OAuthButton } from '@/components/auth/OAuthButton';
import { FormDivider } from '@/components/auth/FormDivider';

const signupFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

type SignupFormData = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<'github' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: '',
      password: '',
      terms_accepted: false,
    },
  });

  const handleOAuthSignup = async (provider: 'github' | 'google') => {
    try {
      setIsOAuthLoading(provider);
      setError(null);

      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In production, this would redirect to OAuth provider
      console.log(`OAuth signup with ${provider}`);

      // For demo: simulate successful OAuth
      // router.push('/auth/verify-email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth signup failed');
    } finally {
      setIsOAuthLoading(null);
    }
  };

  const onSubmit = async (data: SignupFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production, this would call your signup API
      console.log('Signup data:', data);

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/verify-email?email=' + encodeURIComponent(data.email));
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <Card className="border-border rounded-xl border shadow-sm">
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="bg-success rounded-full p-3">
                  <CheckCircle2 className="text-success-foreground h-12 w-12" />
                </div>
              </div>
              <CardTitle className="text-success text-2xl font-bold">Account Created!</CardTitle>
              <CardDescription>
                Your account has been created successfully. Redirecting to email verification...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="bg-primary rounded-xl p-3">
              <Building2 className="text-primary-foreground h-8 w-8" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MantisNXT</h1>
            <p className="text-muted-foreground mt-1 text-sm">Create your account</p>
          </div>
        </div>

        {/* Signup Card */}
        <Card className="border-border rounded-xl border shadow-sm">
          <CardHeader className="space-y-2 pb-4 text-center">
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription className="text-sm">Get started with MantisNXT today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-6">
            {error && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <OAuthButton
                provider="github"
                isLoading={isOAuthLoading === 'github'}
                onClick={() => handleOAuthSignup('github')}
                aria-label="Sign up with GitHub"
              />
              <OAuthButton
                provider="google"
                isLoading={isOAuthLoading === 'google'}
                onClick={() => handleOAuthSignup('google')}
                aria-label="Sign up with Google"
              />
            </div>

            <FormDivider />

            {/* Email/Password Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="bg-input border-border h-11 rounded-lg"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create a strong password"
                            className="bg-input border-border h-11 rounded-lg pr-10"
                            autoComplete="new-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-1/2 right-1 h-9 w-9 -translate-y-1/2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? (
                              <EyeOff className="text-muted-foreground h-4 w-4" />
                            ) : (
                              <Eye className="text-muted-foreground h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terms_accepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-y-0 space-x-3 pt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Accept terms and conditions"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer text-sm font-normal">
                          I agree to the{' '}
                          <Link
                            href="/terms"
                            className="text-primary hover:text-primary/90 font-medium underline underline-offset-2"
                            target="_blank"
                          >
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link
                            href="/privacy"
                            className="text-primary hover:text-primary/90 font-medium underline underline-offset-2"
                            target="_blank"
                          >
                            Privacy Policy
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 w-full rounded-lg font-medium"
                >
                  {isLoading ? (
                    'Creating account...'
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create account
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 px-6 pb-6">
            <div className="text-muted-foreground text-center text-sm">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="text-primary hover:text-primary/90 font-medium transition-colors"
              >
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="text-muted-foreground space-y-1 text-center text-xs">
          <p>© 2024 MantisNXT. Procurement solutions for South African businesses.</p>
          <p>VAT Registration: 4123456789 | BEE Level 4</p>
        </div>
      </div>
    </div>
  );
}
