import { router } from 'expo-router';
import type { PageCard } from '@/lib/community';
import { markSeen } from '@/lib/moreActivity';
import { activityMeta, CommunityRow } from './MoreParts';

/** Side i listen (prototypens CommunityRow): avatar, navn, seneste aktivitet og mint prik ved nyt */
export function PageRow({ page, lastPost, unread, onOpen }: { page: PageCard; lastPost: string | null; unread?: boolean; onOpen?: () => void }) {
  return (
    <CommunityRow
      name={page.name}
      path={page.avatar_path}
      meta={activityMeta(lastPost, page.created_at)}
      unread={unread}
      onPress={() => {
        markSeen(page.id);
        onOpen?.();
        router.push(`/sider/${page.handle}`);
      }}
    />
  );
}
