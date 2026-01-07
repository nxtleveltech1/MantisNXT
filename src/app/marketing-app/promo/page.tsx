"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageCircle, Share2, Download, ImageIcon, FileText, TrendingUp, Users, Eye } from "lucide-react";

export default function PromoPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  const promoStats = [
    {
      title: "Total Views",
      value: "2,847",
      change: "+12.5%",
      icon: Eye,
      color: "text-blue-600"
    },
    {
      title: "Store Visitors",
      value: "456",
      change: "+8.2%",
      icon: Users,
      color: "text-green-600"
    },
    {
      title: "Orders Generated",
      value: "23",
      change: "+15.3%",
      icon: TrendingUp,
      color: "text-purple-600"
    },
    {
      title: "Conversion Rate",
      value: "5.0%",
      change: "+2.1%",
      icon: MessageCircle,
      color: "text-orange-600"
    }
  ];

  const promoCampaigns = [
    {
      name: "WhatsApp Marketing Campaign",
      status: "Active",
      reach: "1,245 views",
      conversions: "18 orders",
      platform: "WhatsApp"
    },
    {
      name: "Instagram Stories Promo",
      status: "Scheduled",
      reach: "Pending",
      conversions: "Pending",
      platform: "Instagram"
    },
    {
      name: "Facebook Marketplace Ads",
      status: "Paused",
      reach: "892 views",
      conversions: "7 orders",
      platform: "Facebook"
    }
  ];

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title="Marketing Promotions" subtitle="Manage and track promotional campaigns" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => router.push("/marketing-app")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Store
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {promoStats.map((stat, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-green-600">{stat.change}</span> from last month
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Generate promotional materials and manage campaigns
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <Button
                    className="h-20 flex flex-col gap-2"
                    variant="outline"
                    onClick={() => setActiveTab("materials")}
                  >
                    <Download className="h-6 w-6" />
                    Download Materials
                  </Button>
                  <Button
                    className="h-20 flex flex-col gap-2"
                    variant="outline"
                    onClick={() => router.push("/marketing-app/stories")}
                  >
                    <Share2 className="h-6 w-6" />
                    Create Stories
                  </Button>
                  <Button
                    className="h-20 flex flex-col gap-2"
                    variant="outline"
                    onClick={() => router.push("/social-media-app")}
                  >
                    <MessageCircle className="h-6 w-6" />
                    Social Media Hub
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Campaigns</CardTitle>
                  <CardDescription>
                    Monitor your promotional campaigns across different platforms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {promoCampaigns.map((campaign, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <h4 className="font-medium">{campaign.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Reach: {campaign.reach}</span>
                            <span>Conversions: {campaign.conversions}</span>
                            <Badge variant="secondary">{campaign.platform}</Badge>
                          </div>
                        </div>
                        <Badge
                          variant={campaign.status === "Active" ? "default" :
                                  campaign.status === "Scheduled" ? "secondary" : "outline"}
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materials" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Promotional Materials</h2>
                <Button onClick={() => router.push("/marketing-app/download")}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Generator
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Social Media Posts
                    </CardTitle>
                    <CardDescription>
                      Optimized images for Instagram, Facebook, and WhatsApp
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Square (1:1)</span>
                        <Badge variant="secondary">1080x1080</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Stories (9:16)</span>
                        <Badge variant="secondary">1080x1920</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Banner (16:9)</span>
                        <Badge variant="secondary">1200x630</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Marketing Copy
                    </CardTitle>
                    <CardDescription>
                      Pre-written promotional text for different platforms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>WhatsApp Messages</span>
                        <Badge variant="secondary">Ready</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Instagram Captions</span>
                        <Badge variant="secondary">Ready</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Email Templates</span>
                        <Badge variant="secondary">Ready</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="h-5 w-5" />
                      QR Codes
                    </CardTitle>
                    <CardDescription>
                      Direct links to your store for easy sharing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Store Link</span>
                        <Badge variant="secondary">Generated</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Product Pages</span>
                        <Badge variant="secondary">Available</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Performance</CardTitle>
                  <CardDescription>
                    Track how your promotional campaigns are performing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Analytics dashboard coming soon</p>
                    <p className="text-sm">Track campaign performance and ROI metrics</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
