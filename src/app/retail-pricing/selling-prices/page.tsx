import { redirect } from 'next/navigation';

/** @deprecated Use `/retail-pricing/price-positioning` */
export default function RetailSellingPricesRedirectPage() {
  redirect('/retail-pricing/price-positioning');
}
