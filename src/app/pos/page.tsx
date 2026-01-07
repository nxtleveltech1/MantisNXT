'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function POSPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new POS app
    router.replace('/pos-app');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600"></div>
    </div>
  );
}

