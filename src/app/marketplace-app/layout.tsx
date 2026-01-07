import { MarketplaceProviders } from "@/lib/marketplace-app/providers";
import { Toaster } from "sonner";

export const metadata = {
  title: "NXT Marketplace",
  description: "Buy and sell verified audio visual equipment",
};

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MarketplaceProviders>
      {children}
      <Toaster />
    </MarketplaceProviders>
  );
}

