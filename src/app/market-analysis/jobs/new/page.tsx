import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';

export default function NewScrapingJobPage() {
  return (
    <AppLayout
      title="New scraping job"
      breadcrumbs={[
        { label: 'Market Analysis', href: '/market-analysis' },
        { label: 'Scraping jobs', href: '/market-analysis/jobs' },
        { label: 'New job' },
      ]}
    >
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">New scraping job</h1>
        <Card className="rounded-[10px]">
          <CardContent className="text-muted-foreground p-6 text-sm">
            Job creation form coming soon.
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
