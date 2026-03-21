import { redirect } from 'next/navigation';

export default function LegacyPricingRedirectPage() {
  redirect('/retail-pricing/price-list');
}
