'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Save, Eye, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface WidgetConfig {
  dashboardId: string;
  type: 'metric_card' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'area_chart' | 'table' | 'alert_list' | 'prediction_list';
  title: string;
  dataSource: {
    type: string;
    params: Record<string, unknown>;
  };
  config: {
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
    aggregation?: string;
    filters?: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
  };
  refreshInterval?: number;
}

interface FilterRule {
  field: string;
  operator: string;
  value: string;
}

const WIDGET_TYPES = [
  { value: 'metric_card', label: 'Metric Card (KPI)' },
  { value: 'line_chart', label: 'Line Chart' },
  { value: 'bar_chart', label: 'Bar Chart' },
  { value: 'pie_chart', label: 'Pie Chart' },
  { value: 'area_chart', label: 'Area Chart' },
  { value: 'table', label: 'Data Table' },
  { value: 'alert_list', label: 'Alert List' },
  { value: 'prediction_list', label: 'Prediction List' },
];

const METRIC_TYPES = [
  { value: 'sales', label: 'Sales Metrics' },
  { value: 'inventory', label: 'Inventory Metrics' },
  { value: 'predictions', label: 'AI Predictions' },
  { value: 'alerts', label: 'AI Alerts' },
  { value: 'forecasts', label: 'Demand Forecasts' },
  { value: 'anomalies', label: 'Anomalies' },
];

const AGGREGATIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'contains', label: 'Contains' },
];

const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // orange
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
];

export default function WidgetConfiguration({ dashboardId }: { dashboardId: string }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<WidgetConfig>({
    dashboardId,
    type: 'metric_card',
    title: '',
    dataSource: {
      type: 'sales',
      params: {},
    },
    config: {
      colors: CHART_COLORS,
      showLegend: true,
      showGrid: true,
      aggregation: 'sum',
      filters: [],
    },
    refreshInterval: 60,
  });

  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [previewData, setPreviewData] = useState<unknown[]>([]);

  // Mock preview data based on widget type
  const generatePreviewData = () => {
    switch (config.type) {
      case 'metric_card':
        return [{ value: 42500, label: 'Total Sales' }];
      case 'line_chart':
      case 'bar_chart':
      case 'area_chart':
        return [
          { name: 'Jan', value: 4000 },
          { name: 'Feb', value: 3000 },
          { name: 'Mar', value: 5000 },
          { name: 'Apr', value: 4500 },
          { name: 'May', value: 6000 },
        ];
      case 'pie_chart':
        return [
          { name: 'Category A', value: 400 },
          { name: 'Category B', value: 300 },
          { name: 'Category C', value: 200 },
          { name: 'Category D', value: 100 },
        ];
      default:
        return [];
    }
  };

  // Create widget mutation
  const createWidgetMutation = useMutation({
    mutationFn: async (widgetConfig: WidgetConfig) => {
      const response = await fetch('/api/v1/ai/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboardId: widgetConfig.dashboardId,
          type: widgetConfig.type,
          title: widgetConfig.title,
          config: widgetConfig.config,
          dataSource: widgetConfig.dataSource,
          refreshInterval: widgetConfig.refreshInterval,
        }),
      });
      if (!response.ok) throw new Error('Failed to create widget');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-widgets'] });
      toast.success('Widget created successfully');
      // Reset form
      setConfig({
        dashboardId,
        type: 'metric_card',
        title: '',
        dataSource: { type: 'sales', params: {} },
        config: {
          colors: CHART_COLORS,
          showLegend: true,
          showGrid: true,
          aggregation: 'sum',
          filters: [],
        },
        refreshInterval: 60,
      });
      setFilters([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create widget: ${error.message}`);
    },
  });

  const handleAddFilter = () => {
    setFilters([...filters, { field: '', operator: 'equals', value: '' }]);
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleUpdateFilter = (index: number, field: keyof FilterRule, value: string) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const handlePreview = () => {
    const data = generatePreviewData();
    setPreviewData(data);
    toast.success('Preview updated');
  };

  const handleSave = () => {
    if (!config.title) {
      toast.error('Please enter a widget title');
      return;
    }

    // Add filters to config
    const updatedConfig = {
      ...config,
      config: {
        ...config.config,
        filters: filters.filter((f) => f.field && f.value),
      },
    };

    createWidgetMutation.mutate(updatedConfig);
  };

  const renderPreview = () => {
    if (previewData.length === 0) return null;

    switch (config.type) {
      case 'metric_card':
        return (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">
                  {previewData[0].value.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground mt-2">{config.title}</div>
              </div>
            </CardContent>
          </Card>
        );

      case 'line_chart':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={previewData}>
              {config.config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke={config.config.colors?.[0]}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar_chart':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={previewData}>
              {config.config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill={config.config.colors?.[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie_chart':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={previewData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {previewData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={config.config.colors?.[index % config.config.colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="text-center text-muted-foreground p-8">
            Preview not available for this widget type
          </div>
        );
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Configuration Panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Widget Configuration</CardTitle>
            <CardDescription>Configure your widget settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="widget-type">Widget Type</Label>
              <Select
                value={config.type}
                onValueChange={(value: unknown) => setConfig({ ...config, type: value })}
              >
                <SelectTrigger id="widget-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="widget-title">Title</Label>
              <Input
                id="widget-title"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Enter widget title..."
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="data-source">Data Source</Label>
              <Select
                value={config.dataSource.type}
                onValueChange={(value) =>
                  setConfig({
                    ...config,
                    dataSource: { ...config.dataSource, type: value },
                  })
                }
              >
                <SelectTrigger id="data-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_TYPES.map((metric) => (
                    <SelectItem key={metric.value} value={metric.value}>
                      {metric.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {['line_chart', 'bar_chart', 'area_chart'].includes(config.type) && (
              <div className="space-y-2">
                <Label htmlFor="aggregation">Aggregation</Label>
                <Select
                  value={config.config.aggregation}
                  onValueChange={(value) =>
                    setConfig({
                      ...config,
                      config: { ...config.config, aggregation: value },
                    })
                  }
                >
                  <SelectTrigger id="aggregation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATIONS.map((agg) => (
                      <SelectItem key={agg.value} value={agg.value}>
                        {agg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Refresh Interval (seconds)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[config.refreshInterval || 60]}
                  onValueChange={(value) => setConfig({ ...config, refreshInterval: value[0] })}
                  min={30}
                  max={300}
                  step={30}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">{config.refreshInterval}s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filters</CardTitle>
              <Button size="sm" variant="outline" onClick={handleAddFilter}>
                <Plus className="h-4 w-4 mr-1" />
                Add Filter
              </Button>
            </div>
            <CardDescription>Add filters to refine your data</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {filters.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No filters added yet
                  </p>
                ) : (
                  filters.map((filter, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Field name"
                          value={filter.field}
                          onChange={(e) => handleUpdateFilter(index, 'field', e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={filter.operator}
                            onValueChange={(value) => handleUpdateFilter(index, 'operator', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OPERATORS.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Value"
                            value={filter.value}
                            onChange={(e) => handleUpdateFilter(index, 'value', e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFilter(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            className="flex-1"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={createWidgetMutation.isPending}
            className="flex-1"
          >
            {createWidgetMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Widget
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>See how your widget will look</CardDescription>
          </CardHeader>
          <CardContent>
            {previewData.length === 0 ? (
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
                <div className="text-center">
                  <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click &ldquo;Preview&rdquo; to see your widget
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm font-medium">{config.title || 'Untitled Widget'}</div>
                {renderPreview()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visual Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                {CHART_COLORS.map((color, index) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      config.config.colors?.[0] === color
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() =>
                      setConfig({
                        ...config,
                        config: {
                          ...config.config,
                          colors: [color, ...CHART_COLORS.filter((c) => c !== color)],
                        },
                      })
                    }
                  />
                ))}
              </div>
            </div>

            {['line_chart', 'bar_chart', 'area_chart'].includes(config.type) && (
              <>
                <div className="flex items-center justify-between">
                  <Label>Show Grid</Label>
                  <input
                    type="checkbox"
                    checked={config.config.showGrid}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        config: { ...config.config, showGrid: e.target.checked },
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Show Legend</Label>
                  <input
                    type="checkbox"
                    checked={config.config.showLegend}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        config: { ...config.config, showLegend: e.target.checked },
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
