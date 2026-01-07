"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransition } from "react";

type MarketplaceHeaderProps = {
  searchQuery?: string;
};

export function MarketplaceHeader({ searchQuery = "" }: MarketplaceHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleSearchChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.push(`/marketplace-app?${params.toString()}`);
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center gap-4 px-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/portal")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Portal
        </Button>
        
        <Link href="/marketplace-app" className="flex items-center gap-2 font-semibold text-xl">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            NXT
          </div>
          <span className="hidden sm:inline-block">NXT Marketplace</span>
        </Link>

        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search audio visual equipment..."
              defaultValue={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <nav className="flex items-center gap-2 ml-auto">
          <Button asChild variant="ghost" size="icon">
            <Link href="/marketplace-app/messages">
              <MessageSquare className="size-5" />
              <span className="sr-only">Messages</span>
            </Link>
          </Button>
          <Button asChild variant="default">
            <Link href="/marketplace-app/seller/listings/create">
              <Plus className="size-4 mr-2" />
              <span className="hidden sm:inline">Sell</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

