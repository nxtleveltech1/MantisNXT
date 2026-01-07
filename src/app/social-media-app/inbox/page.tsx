import ResponseCommandCenter from "@/components/social-media/inbox/ResponseCommandCenter";
import UnifiedInbox from "@/components/social-media/inbox/UnifiedInbox";

export const dynamic = "force-dynamic";

export default async function SocialMediaInboxPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                ← Back to Dashboard
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📨</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Unified Inbox</h1>
                  <p className="text-sm text-gray-500">Manage all your social media conversations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <ResponseCommandCenter />
          <UnifiedInbox />
        </div>
      </main>
    </div>
  );
}
