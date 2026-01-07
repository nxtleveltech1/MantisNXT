"use client";

import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Facebook,
  Instagram,
  Video,
  MessageSquare,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const platformIcons = {
  Facebook: { icon: Facebook, color: 'text-blue-600' },
  Instagram: { icon: Instagram, color: 'text-pink-600' },
  TikTok: { icon: Video, color: 'text-black' },
  WhatsApp: { icon: MessageSquare, color: 'text-green-600' },
};

export default function SocialMediaAnalyticsPage() {
  const router = useRouter();

  // Mock data for now - will be replaced with actual database queries
  const channels = [
    { id: 1, name: 'Facebook | NXT Level Tech SA', platform: 'Facebook' },
    { id: 2, name: 'Instagram | @nxtleveltech_sa', platform: 'Instagram' },
    { id: 3, name: 'TikTok | @nxtleveltech', platform: 'TikTok' },
    { id: 4, name: 'WhatsApp | Business Chat', platform: 'WhatsApp' },
  ];

  const impressions = 245000;
  const kpis = [
    {
      name: 'Total Impressions',
      value: impressions >= 1000000
        ? `${(impressions / 1000000).toFixed(1)}M`
        : impressions >= 1000
        ? `${(impressions / 1000).toFixed(1)}K`
        : String(impressions),
      change: '+12.5%',
      trend: 'up' as const
    },
    {
      name: 'Engagement Rate',
      value: '8.2%',
      change: '+0.4%',
      trend: 'up' as const
    },
    {
      name: 'Total Posts',
      value: '142',
      change: '+5',
      trend: 'up' as const
    },
    {
      name: 'Total Engagement',
      value: '8,420',
      change: '+8%',
      trend: 'up' as const
    },
  ];

  // Calculate lead distribution based on channels
  const channelData = channels.map(channel => ({
    name: channel.name.includes('|') ? channel.name.split('|')[0].trim() : channel.name,
    platform: channel.platform,
    growth: channel.platform === 'Instagram' ? '+28%' : channel.platform === 'TikTok' ? '+142%' : '+15%',
    engagement: channel.platform === 'TikTok' ? '22.1%' : channel.platform === 'Instagram' ? '8.4%' : '5.2%',
    leads: channel.platform === 'Instagram' ? 820 : channel.platform === 'Facebook' ? 450 : channel.platform === 'WhatsApp' ? 240 : 120,
    ...platformIcons[channel.platform as keyof typeof platformIcons]
  }));

  const totalLeads = channelData.reduce((acc, curr) => acc + curr.leads, 0);

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
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📊</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Analytics & Insights</h1>
                  <p className="text-sm text-gray-500">Comprehensive performance data for marketing campaigns</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi) => (
              <div key={kpi.name} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-500">{kpi.name}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  <div className={`flex items-center text-sm font-medium ${
                    kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {kpi.change}
                    {kpi.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Growth Chart Placeholder */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-gray-900 flex items-center space-x-2">
                  <BarChart3 size={18} className="text-blue-600" />
                  <span>Growth Trends (Last 30 Days)</span>
                </h3>
                <select className="text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                  <option>All Platforms</option>
                  {channels.map(c => (
                    <option key={c.id}>{c.platform}</option>
                  ))}
                </select>
              </div>
              <div className="h-64 flex items-end justify-between gap-2">
                {[45, 60, 55, 80, 70, 90, 85, 100, 95, 110, 105, 120].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-blue-600 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-gray-400 font-medium">W{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Channel Distribution */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-6 flex items-center space-x-2">
                <Target size={18} className="text-blue-600" />
                <span>Lead Distribution</span>
              </h3>
              <div className="space-y-6">
                {channelData.map((channel) => (
                  <div key={channel.platform}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {channel.icon && <channel.icon size={16} className={channel.color} />}
                        <span className="text-sm font-medium text-gray-700">{channel.platform}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{channel.leads}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          channel.color?.replace('text', 'bg') || 'bg-gray-600'
                        }`}
                        style={{ width: `${(channel.leads / totalLeads) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Total Leads</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{totalLeads.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
