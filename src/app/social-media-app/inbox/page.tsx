"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ResponseCommandCenter from "@/components/social-media/inbox/ResponseCommandCenter";
import UnifiedInbox from "@/components/social-media/inbox/UnifiedInbox";

export default function SocialMediaInboxPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push("/social-media-app")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
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