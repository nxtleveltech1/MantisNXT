import { notFound } from 'next/navigation';
import { DocumentDetailPage } from '@/components/docustore/DocumentDetailPage';
import { DocumentService } from '@/lib/services/docustore';

interface DocumentDetailPageProps {
  params: { id: string };
}

export default async function DocumentPage({ params }: DocumentDetailPageProps) {
  const document = await DocumentService.getDocumentById(params.id, true);

  if (!document) {
    notFound();
  }

  return <DocumentDetailPage document={document} />;
}
