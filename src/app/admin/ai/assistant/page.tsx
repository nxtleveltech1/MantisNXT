import AdminLayout from "@/components/layout/AdminLayout"
import ChatAssistant from "@/components/ai/assistant/ChatAssistant"

export default function AIAssistantPage() {
  return (
    <AdminLayout breadcrumbs={[{ label: 'AI Services', href: '/admin/ai/config' }, { label: 'Assistant' }] }>
      <ChatAssistant />
    </AdminLayout>
  )
}

