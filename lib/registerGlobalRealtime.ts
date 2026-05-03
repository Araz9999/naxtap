import { queryClient } from '@/lib/queryClient';
import { realtimeService } from '@/lib/realtime';
import { useListingStore } from '@/store/listingStore';
import { useModerationSettingsStore } from '@/store/moderationSettingsStore';
import type { ModerationSettings } from '@/store/moderationSettingsStore';

let registered = false;

function invalidateQueriesMatching(substr: string) {
  void queryClient.invalidateQueries({
    predicate: (q) => JSON.stringify(q.queryKey).includes(substr),
  });
}

function applyTag(tag: string) {
  switch (tag) {
    case 'moderation':
      invalidateQueriesMatching('moderation');
      break;
    case 'support':
      invalidateQueriesMatching('support');
      invalidateQueriesMatching('liveChat');
      break;
    case 'admin':
    case 'adminAnalytics':
      invalidateQueriesMatching('admin');
      break;
    case 'listings':
      invalidateQueriesMatching('listing');
      break;
    default:
      invalidateQueriesMatching(tag);
  }
}

function coerceModerationSettings(raw: Record<string, unknown>): Partial<ModerationSettings> | null {
  const out: Partial<ModerationSettings> = {};
  if (typeof raw.autoRefresh === 'boolean') out.autoRefresh = raw.autoRefresh;
  if (raw.autoRefreshIntervalSec === 15 || raw.autoRefreshIntervalSec === 30 || raw.autoRefreshIntervalSec === 60) {
    out.autoRefreshIntervalSec = raw.autoRefreshIntervalSec;
  }
  if (typeof raw.showResolvedReports === 'boolean') out.showResolvedReports = raw.showResolvedReports;
  if (typeof raw.showDismissedReports === 'boolean') out.showDismissedReports = raw.showDismissedReports;
  if (typeof raw.notifyOnNewReport === 'boolean') out.notifyOnNewReport = raw.notifyOnNewReport;
  return Object.keys(out).length ? out : null;
}

/** Subscribe once: dashboard invalidation, listing feed refresh, moderation settings broadcast. */
export function registerGlobalRealtimeHandlers(): void {
  if (registered) return;
  registered = true;

  realtimeService.on('admin:invalidate', (payload?: { tags?: string[] }) => {
    const tags =
      payload?.tags && payload.tags.length > 0
        ? payload.tags
        : ['moderation', 'support', 'admin', 'listings'];
    tags.forEach(applyTag);
  });

  realtimeService.on('moderation:settings', (payload: Record<string, unknown>) => {
    const patch = coerceModerationSettings(payload);
    if (patch) useModerationSettingsStore.getState().setSettings(patch);
  });

  realtimeService.on('listing:invalidate', () => {
    void useListingStore.getState().fetchListings().catch(() => undefined);
    invalidateQueriesMatching('listing');
  });
}
