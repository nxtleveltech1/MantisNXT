'use client';

export function ActivityFeed({ activities }: { activities: Array<any> }) {
  if (!activities || activities.length === 0) {
    return <div className="text-sm text-muted-foreground">No activity yet.</div>;
  }

  return (
    <div className="space-y-2">
      {activities.map(activity => (
        <div key={activity.activity_id} className="rounded border p-3">
          <div className="text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString()}</div>
          <div className="text-sm">
            {activity.action} {activity.entity_type} {activity.entity_id}
          </div>
        </div>
      ))}
    </div>
  );
}
