# Forms Quick Reference Guide

## Component Imports

```tsx
// OAuth Button
import { OAuthButton } from '@/components/auth/OAuthButton'

// Form Divider
import { FormDivider } from '@/components/auth/FormDivider'

// Subscription Form
import { SubscriptionUpgradeForm } from '@/components/subscription/SubscriptionUpgradeForm'

// UI Components
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
```

## Usage Examples

### OAuth Button
```tsx
<OAuthButton
  provider="github"
  isLoading={isOAuthLoading === 'github'}
  onClick={() => handleOAuthLogin('github')}
  aria-label="Sign in with GitHub"
/>
```

### Form Divider
```tsx
<FormDivider text="OR CONTINUE WITH" />
```

### Complete Form Example
```tsx
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
              className="h-11 bg-input border-border rounded-lg"
              autoComplete="email"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <Button
      type="submit"
      className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium"
    >
      Submit
    </Button>
  </form>
</Form>
```

## Design Tokens

### Input Styling
```tsx
className="h-11 bg-input border-border rounded-lg"
```

### Button Styling
```tsx
// Primary
className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium"

// Outline
className="w-full h-11 rounded-lg"
variant="outline"
```

### Card Container
```tsx
className="border border-border shadow-sm rounded-xl"
```

### Label Styling
```tsx
className="text-sm font-medium"
```

## Common Patterns

### Password Input with Toggle
```tsx
const [showPassword, setShowPassword] = useState(false)

<div className="relative">
  <Input
    type={showPassword ? 'text' : 'password'}
    placeholder="Enter your password"
    className="h-11 bg-input border-border rounded-lg pr-10"
    autoComplete="current-password"
    {...field}
  />
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 hover:bg-transparent"
    onClick={() => setShowPassword(!showPassword)}
    aria-label={showPassword ? 'Hide password' : 'Show password'}
  >
    {showPassword ? (
      <EyeOff className="h-4 w-4 text-muted-foreground" />
    ) : (
      <Eye className="h-4 w-4 text-muted-foreground" />
    )}
  </Button>
</div>
```

### Error Alert
```tsx
{error && (
  <Alert variant="destructive" className="rounded-lg">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

### Success State
```tsx
<div className="flex justify-center">
  <div className="bg-success/10 p-4 rounded-full">
    <CheckCircle2 className="h-12 w-12 text-success" />
  </div>
</div>
```

### Info Alert
```tsx
<Alert className="rounded-lg bg-info/5 border-info/20">
  <AlertCircle className="h-4 w-4 text-info" />
  <AlertDescription className="text-sm">
    Your informative message here
  </AlertDescription>
</Alert>
```

### Two-Column Grid (Responsive)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Form fields */}
</div>
```

## Page Layouts

### Auth Page Layout
```tsx
<div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
  <div className="w-full max-w-md space-y-6">
    {/* Header */}
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="bg-primary p-3 rounded-xl">
          <Building2 className="h-8 w-8 text-primary-foreground" />
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MantisNXT</h1>
        <p className="text-sm text-muted-foreground mt-1">Your subtitle</p>
      </div>
    </div>

    {/* Card */}
    <Card className="border border-border shadow-sm rounded-xl">
      {/* Content */}
    </Card>

    {/* Footer */}
    <div className="text-center text-xs text-muted-foreground">
      <p>© 2024 MantisNXT</p>
    </div>
  </div>
</div>
```

## Validation Schemas

### Login Schema
```tsx
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(3, 'Password must be at least 3 characters'),
  remember_me: z.boolean().optional(),
})
```

### Signup Schema
```tsx
const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  terms_accepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
})
```

## Accessibility Checklist

- [ ] All inputs have associated labels
- [ ] ARIA labels on icon buttons
- [ ] Keyboard navigation tested
- [ ] Focus indicators visible
- [ ] Error messages announced
- [ ] Loading states have proper text
- [ ] Color contrast meets WCAG AAA
- [ ] Autocomplete attributes set

## Routes

- `/auth/login` - Sign in page
- `/auth/signup` - Create account page
- `/auth/forgot-password` - Password reset page
- `/auth/verify-email` - Email verification
- `/auth/two-factor` - 2FA verification
- `/subscription/upgrade` - Subscription upgrade

---

**Need help?** Check `FORM_REDESIGN_COMPLETE.md` for detailed documentation.
