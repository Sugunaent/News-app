import { useEffect, useState } from 'react';
import {
  FileText, Users, MessageSquare, HelpCircle, CheckCircle2,
  MousePointerClick, TrendingUp, ArrowRight, Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { fetchAnalytics } from '@/lib/admin/api';
import type { AnalyticsData } from '@/lib/admin/adminTypes';

interface DashboardSectionProps {
  onNavigate: (key: string) => void;
}

interface MetricCardProps {
  icon: typeof FileText;
  label: string;
  value: number;
}

function MetricCard({ icon: Icon, label, value }: MetricCardProps) {
  return (
    <GlassCard hover className="p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--brand-accent)', opacity: 0.15 }}
        >
          <Icon className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
        </div>
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <p className="font-display text-3xl" style={{ color: 'var(--text-primary)' }}>
        {value.toLocaleString()}
      </p>
    </GlassCard>
  );
}

export function DashboardSection({ onNavigate }: DashboardSectionProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
        <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading analytics...
        </p>
      </div>
    );
  }

  const metrics: { icon: typeof FileText; label: string; value: number }[] = [
    { icon: FileText, label: 'Articles', value: data.totals.articles },
    { icon: CheckCircle2, label: 'Published', value: data.totals.published_articles },
    { icon: Users, label: 'Users', value: data.totals.users },
    { icon: MessageSquare, label: 'Comments', value: data.totals.comments },
    { icon: HelpCircle, label: 'Quiz Attempts', value: data.totals.quiz_attempts },
    { icon: CheckCircle2, label: 'Completions', value: data.totals.completions },
    { icon: MousePointerClick, label: 'Ad Clicks', value: data.totals.ad_clicks },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl md:text-3xl mb-6" style={{ color: 'var(--text-primary)' }}>
          Dashboard Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <MetricCard key={m.label} icon={m.icon} label={m.label} value={m.value} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
            <h3 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>
              Recent Activity
            </h3>
          </div>
          <div className="space-y-3">
            {data.recent_activity.map((activity, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b last:border-b-0"
                style={{ borderColor: 'var(--border-default)' }}
              >
                <span className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {activity.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>
                    {activity.value.toLocaleString()}
                  </span>
                  <span
                    className="font-body text-xs"
                    style={{ color: activity.change.startsWith('-') ? '#ef4444' : 'var(--brand-primary)' }}
                  >
                    {activity.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard hover={false} className="p-6">
          <h3 className="font-display text-xl mb-4" style={{ color: 'var(--text-primary)' }}>
            Quick Actions
          </h3>
          <div className="space-y-3">
            {[
              { key: 'articles', label: 'Manage Articles', icon: FileText },
              { key: 'users', label: 'Manage Users', icon: Users },
              { key: 'analytics', label: 'View Analytics', icon: TrendingUp },
            ].map((action) => (
              <button
                key={action.key}
                onClick={() => onNavigate(action.key)}
                className="w-full flex items-center justify-between p-4 rounded-lg transition-all duration-200 group"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div className="flex items-center gap-3">
                  <action.icon className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                  <span className="font-body text-sm" style={{ color: 'var(--text-primary)' }}>
                    {action.label}
                  </span>
                </div>
                <ArrowRight
                  className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  style={{ color: 'var(--text-muted)' }}
                />
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
