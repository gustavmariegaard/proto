import { router } from 'expo-router';
import type { GroupCard } from '@/lib/community';
import { markSeen } from '@/lib/moreActivity';
import { activityMeta, CommunityRow } from './MoreParts';

/** Gruppe i listen (prototypens CommunityRow): avatar, navn, seneste aktivitet og mint prik ved nyt */
export function GroupRow({ group, lastPost, unread, onOpen }: { group: GroupCard; lastPost: string | null; unread?: boolean; onOpen?: () => void }) {
  return (
    <CommunityRow
      name={group.name}
      path={group.avatar_path}
      meta={activityMeta(lastPost, group.created_at)}
      unread={unread}
      onPress={() => {
        markSeen(group.id);
        onOpen?.();
        router.push(`/grupper/${group.id}`);
      }}
    />
  );
}
