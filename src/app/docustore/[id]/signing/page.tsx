import { notFound } from 'next/navigation';
import { SigningWorkflowPage } from '@/components/docustore/SigningWorkflowPage';

interface SigningPageProps {
  params: { id: string };
}

export default async function SigningPage({ params }: SigningPageProps) {
  return <SigningWorkflowPage documentId={params.id} />;
}

