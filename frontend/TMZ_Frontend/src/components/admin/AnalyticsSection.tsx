import { useEffect, useState } from 'react';
import {
  BarChart3, FileText, Users, MessageSquare, HelpCircle,
  CheckCircle2, Share2, MousePointerClick, Eye, Clock,
  TrendingUp, Target, Bookmark, Activity, Loader2,
} from 'lucide-react';
import type { AnalyticsData } from '@/lib/admin/adminTypes';
import { fetchAnalytics } from '@/lib/admin/api';
import { GlassCard } from '@/components/ui/GlassCard';

const TOTAL_METRICS: { key: keyof AnalyticsData['totals']; label: string; icon: typeof FileText }[] = [
  { key: 'articles', label: 'Articles', icon: FileText },
  { key: 'published_articles', label: 'Published', icon: CheckCircle2 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'comments', label: 'Comments', icon: MessageSquare },
  { key: 'quiz_attempts', label: 'Quiz Attempts', icon: HelpCircle },
  { key: 'completions', label: 'Completions', icon: Target },
  { key: 'shares', label: 'Shares', icon: Share2 },
  { key: 'ad_clicks', label: 'Ad Clicks', icon: MousePointerClick },
  { key: 'ad_impressions', label: 'Ad Impressions', icon: Eye },
];

const ENGAGEMENT_METRICS: { key: keyof AnalyticsData['engagement']; label: string; icon: typeof Clock; suffix: string }[] = [
  { key: 'avg_reading_time', label: 'Avg Reading Time', icon: Clock, suffix: ' min' },
  { key: 'avg_completion_rate', label: 'Completion Rate', icon: TrendingUp, suffix: '%' },
  { key: 'quiz_accuracy', label: 'Quiz Accuracy', icon: Target, suffix: '%' },
  { key: 'bookmark_rate', label: 'Bookmark Rate', icon: Bookmark, suffix: '%' },
];

export function AnalyticsSection(): JSX.Element {
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
        <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
        <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>Analytics</h2>
      </div>

      <GlassCard hover={false} className="p-6">
        <h3 className="font-display text-lg mb-4" style={{ color: 'var(--text-primary)' }}>Totals</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
          {TOTAL_METRICS.map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="p-4 rounded-xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                <span className="text-xs font-body" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              </div>
              <p className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
                {data.totals[key].toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard hover={false} className="p-6">
        <h3 className="font-display text-lg mb-4" style={{ color: 'var(--text-primary)' }}>Engagement</h3>
        <div className="space-y-5">
          {ENGAGEMENT_METRICS.map(({ key, label, icon: Icon, suffix }) => {
            const value = data.engagement[key];
            const pct = suffix === '%' ? value : Math.min((value / 10) * 100, 100);
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                    <span className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                  <span className="text-sm font-display" style={{ color: 'var(--text-primary)' }}>
                    {value}{suffix}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--border-default)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: 'var(--brand-primary)' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
          <h3 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
        </div>
        <div className="space-y-3">
          {data.recent_activity.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 border-b last:border-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <p className="text-sm font-body" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{item.change}</p>
              </div>
              <span className="font-display text-lg" style={{ color: 'var(--brand-primary)' }}>
                {item.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
