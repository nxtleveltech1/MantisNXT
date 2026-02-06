'use client';

export type RoadmapItem = {
  id: string;
  title: string;
  date?: string | null;
  status?: string | null;
  type: 'task' | 'milestone';
};

export function RoadmapTimeline({ items }: { items: RoadmapItem[] }) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">No roadmap items available.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <div className="flex-1">
            <div className="text-sm font-medium">{item.title}</div>
            <div className="text-xs text-muted-foreground">
              {item.date ? new Date(item.date).toLocaleDateString() : 'No date'} {'\u00B7'} {item.type}
              {item.status ? ` \u00B7 ${item.status}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
