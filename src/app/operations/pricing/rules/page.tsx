import { redirect } from 'next/navigation';

export default function LegacyPricingRulesRedirectPage() {
  redirect('/retail-pricing/rules');
}
