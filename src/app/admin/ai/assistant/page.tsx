import AppLayout from '@/components/layout/AppLayout';
import ChatAssistant from '@/components/ai/assistant/ChatAssistant';

export default function AIAssistantPage() {
  return (
    <AppLayout
      breadcrumbs={[{ label: 'AI Services', href: '/admin/ai/config' }, { label: 'Assistant' }]}
    >
      <ChatAssistant />
    </AppLayout>
  );
}
