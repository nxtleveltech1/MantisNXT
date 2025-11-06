'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  LayoutDashboard,
  Plus,
  Save,
  Share2,
  Trash2,
  GripVertical,
  BarChart3,
  TrendingUp,
  Table as TableIcon,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Dashboard {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  layout: Layout[];
  filters?: Record<string, any>;
  is_default: boolean;
  is_shared: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  widgets?: Widget[];
}

interface Widget {
  id: string;
  org_id: string;
  dashboard_id: string;
  widget_type: string;
  metric_type: string;
  config: Record<string, any>;
  query: Record<string, any>;
  refresh_interval_seconds: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

const WIDGET_LIBRARY = [
  { type: 'metric_card', icon: TrendingUp, label: 'Metric Card', color: 'text-blue-600' },
  { type: 'line_chart', icon: BarChart3, label: 'Line Chart', color: 'text-green-600' },
  { type: 'bar_chart', icon: BarChart3, label: 'Bar Chart', color: 'text-purple-600' },
  { type: 'pie_chart', icon: BarChart3, label: 'Pie Chart', color: 'text-orange-600' },
  { type: 'table', icon: TableIcon, label: 'Data Table', color: 'text-cyan-600' },
  { type: 'alert_list', icon: AlertCircle, label: 'Alert List', color: 'text-red-600' },
];

interface DashboardBuilderProps {
  dashboardId?: string;
}

export default function DashboardBuilder({ dashboardId }: DashboardBuilderProps = {}) {
  const queryClient = useQueryClient();
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>(dashboardId || '');
  const [layout, setLayout] = useState<Layout[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newDashboard, setNewDashboard] = useState({
    name: '',
    description: '',
    isPublic: false,
  });

  // Fetch dashboards
  const { data: dashboardsResponse, isLoading } = useQuery<{
    data: Dashboard[];
    metadata: { total: number; page: number; limit: number; hasMore: boolean };
  }>({
    queryKey: ['ai-dashboards'],
    queryFn: async () => {
      const response = await fetch('/api/v1/ai/dashboards?includeWidgets=false&limit=100');
      if (!response.ok) throw new Error('Failed to fetch dashboards');
      return response.json();
    },
  });

  const dashboards = dashboardsResponse?.data || [];

  // Fetch widgets for selected dashboard
  const { data: widgetsResponse } = useQuery<{
    data: { dashboardId: string; widgets: Widget[]; totalWidgets: number };
  }>({
    queryKey: ['ai-widgets', selectedDashboardId],
    queryFn: async () => {
      if (!selectedDashboardId) return { data: { dashboardId: '', widgets: [], totalWidgets: 0 } };
      const response = await fetch(`/api/v1/ai/widgets/dashboard/${selectedDashboardId}`);
      if (!response.ok) throw new Error('Failed to fetch widgets');
      return response.json();
    },
    enabled: !!selectedDashboardId,
  });

  const widgets = widgetsResponse?.data?.widgets || [];

  // Create dashboard
  const createDashboardMutation = useMutation({
    mutationFn: async (data: typeof newDashboard) => {
      const response = await fetch('/api/v1/ai/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          layout: [],
          isPublic: data.isPublic,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create dashboard');
      }
      return response.json();
    },
    onSuccess: (responseData) => {
      queryClient.invalidateQueries({ queryKey: ['ai-dashboards'] });
      setSelectedDashboardId(responseData.data.id);
      setIsCreating(false);
      setNewDashboard({ name: '', description: '', isPublic: false });
      toast.success('Dashboard created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create dashboard: ${error.message}`);
    },
  });

  // Update dashboard (including layout)
  const updateDashboardMutation = useMutation({
    mutationFn: async ({ dashboardId, layout }: { dashboardId: string; layout: Layout[] }) => {
      const response = await fetch(`/api/v1/ai/dashboards/${dashboardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update dashboard');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['ai-widgets', selectedDashboardId] });
      toast.success('Layout saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save layout: ${error.message}`);
    },
  });

  // Delete dashboard
  const deleteDashboardMutation = useMutation({
    mutationFn: async (dashboardId: string) => {
      const response = await fetch(`/api/v1/ai/dashboards/${dashboardId}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete dashboard');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-dashboards'] });
      setSelectedDashboardId('');
      setLayout([]);
      toast.success('Dashboard deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete dashboard: ${error.message}`);
    },
  });

  // Share dashboard
  const shareDashboardMutation = useMutation({
    mutationFn: async ({ dashboardId, makePublic }: { dashboardId: string; makePublic: boolean }) => {
      const response = await fetch(`/api/v1/ai/dashboards/${dashboardId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ makePublic }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to share dashboard');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-dashboards'] });
      toast.success('Dashboard sharing updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update sharing: ${error.message}`);
    },
  });

  // Create widget
  const createWidgetMutation = useMutation({
    mutationFn: async (widgetData: {
      dashboardId: string;
      type: string;
      title: string;
      config: Record<string, any>;
      dataSource: { type: string; params: Record<string, any> };
      refreshInterval?: number;
    }) => {
      const response = await fetch('/api/v1/ai/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(widgetData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create widget');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-widgets', selectedDashboardId] });
      queryClient.invalidateQueries({ queryKey: ['ai-dashboards'] });
      toast.success('Widget created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create widget: ${error.message}`);
    },
  });

  // Delete widget
  const deleteWidgetMutation = useMutation({
    mutationFn: async (widgetId: string) => {
      const response = await fetch(`/api/v1/ai/widgets/${widgetId}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete widget');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-widgets', selectedDashboardId] });
      queryClient.invalidateQueries({ queryKey: ['ai-dashboards'] });
      toast.success('Widget deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete widget: ${error.message}`);
    },
  });

  // Add widget to layout
  const handleAddWidget = (widgetType: string) => {
    if (!selectedDashboardId) {
      toast.error('Please select a dashboard first');
      return;
    }

    // Calculate position
    const x = (layout.length * 3) % 12;
    const y = Infinity; // Will place at bottom

    // Create widget via API
    createWidgetMutation.mutate({
      dashboardId: selectedDashboardId,
      type: widgetType,
      title: WIDGET_LIBRARY.find(w => w.type === widgetType)?.label || widgetType,
      config: {
        position: { x, y },
        size: { w: 3, h: 2 },
        metricType: 'operational',
      },
      dataSource: {
        type: 'mock',
        params: {},
      },
      refreshInterval: 300,
    });

    // Add to local layout for immediate feedback
    const newWidget: Layout = {
      i: `widget-${Date.now()}`,
      x,
      y,
      w: 3,
      h: 2,
      minW: 2,
      minH: 2,
    };

    setLayout([...layout, newWidget]);
  };

  // Save layout
  const handleSaveLayout = () => {
    if (!selectedDashboardId) return;
    updateDashboardMutation.mutate({ dashboardId: selectedDashboardId, layout });
  };

  // Delete dashboard handler
  const handleDeleteDashboard = (dashboardId: string) => {
    if (confirm('Are you sure you want to delete this dashboard? This action cannot be undone.')) {
      deleteDashboardMutation.mutate(dashboardId);
    }
  };

  // Handle layout change from grid
  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout);
  };

  const selectedDashboard = dashboards.find((d) => d.id === selectedDashboardId);

  // Initialize layout when dashboard is selected
  useEffect(() => {
    if (selectedDashboard) {
      setLayout(selectedDashboard.layout || []);
    } else {
      setLayout([]);
    }
  }, [selectedDashboard]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] gap-6">
      {/* Sidebar - Dashboard List */}
      <div className="w-64 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Dashboards</h3>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Dashboard</DialogTitle>
                <DialogDescription>
                  Create a new dashboard to organize your widgets
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newDashboard.name}
                    onChange={(e) => setNewDashboard({ ...newDashboard, name: e.target.value })}
                    placeholder="My Dashboard"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newDashboard.description}
                    onChange={(e) =>
                      setNewDashboard({ ...newDashboard, description: e.target.value })
                    }
                    placeholder="Dashboard description..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="public">Public Dashboard</Label>
                  <Switch
                    id="public"
                    checked={newDashboard.isPublic}
                    onCheckedChange={(checked) =>
                      setNewDashboard({ ...newDashboard, isPublic: checked })
                    }
                  />
                </div>
                <Button
                  onClick={() => createDashboardMutation.mutate(newDashboard)}
                  disabled={!newDashboard.name || createDashboardMutation.isPending}
                  className="w-full"
                >
                  {createDashboardMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Dashboard
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[calc(100vh-350px)]">
          <div className="space-y-2">
            {dashboards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dashboards yet</p>
            ) : (
              dashboards.map((dashboard) => (
                <Card
                  key={dashboard.id}
                  className={`cursor-pointer transition-colors ${
                    selectedDashboardId === dashboard.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedDashboardId(dashboard.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{dashboard.name}</h4>
                        {dashboard.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {dashboard.description}
                          </p>
                        )}
                      </div>
                      <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Widget Library */}
        {selectedDashboardId && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Widget Library</h3>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {WIDGET_LIBRARY.map((widget) => {
                  const Icon = widget.icon;
                  return (
                    <Button
                      key={widget.type}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleAddWidget(widget.type)}
                    >
                      <Icon className={`mr-2 h-4 w-4 ${widget.color}`} />
                      {widget.label}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Main Canvas */}
      <div className="flex-1 space-y-4">
        {selectedDashboard ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedDashboard.name}</h2>
                {selectedDashboard.description && (
                  <p className="text-sm text-muted-foreground">{selectedDashboard.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    shareDashboardMutation.mutate({
                      dashboardId: selectedDashboard.id,
                      makePublic: !selectedDashboard.is_shared,
                    })
                  }
                  disabled={shareDashboardMutation.isPending}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  {selectedDashboard.is_shared ? 'Make Private' : 'Share'}
                </Button>
                <Button
                  onClick={handleSaveLayout}
                  disabled={updateDashboardMutation.isPending}
                >
                  {updateDashboardMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Layout
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteDashboard(selectedDashboard.id)}
                  disabled={deleteDashboardMutation.isPending}
                >
                  {deleteDashboardMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </Button>
              </div>
            </div>

            <Card className="min-h-[600px]">
              <CardContent className="p-4">
                {layout.length === 0 ? (
                  <div className="flex items-center justify-center h-[500px]">
                    <div className="text-center">
                      <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Empty Dashboard</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add widgets from the library to get started
                      </p>
                    </div>
                  </div>
                ) : (
                  <GridLayout
                    className="layout"
                    layout={layout}
                    cols={12}
                    rowHeight={80}
                    width={1200}
                    onLayoutChange={handleLayoutChange}
                    draggableHandle=".drag-handle"
                    compactType="vertical"
                  >
                    {layout.map((item) => (
                      <div key={item.i} className="bg-white border-2 border-dashed border-muted rounded-lg">
                        <Card className="h-full">
                          <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 drag-handle cursor-move text-muted-foreground" />
                              <CardTitle className="text-sm">Widget {item.i}</CardTitle>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLayout(layout.filter((l) => l.i !== item.i))}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </CardHeader>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                              Configure this widget
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </GridLayout>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <LayoutDashboard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No Dashboard Selected</h3>
              <p className="text-muted-foreground mb-4">
                Select a dashboard from the sidebar or create a new one
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
