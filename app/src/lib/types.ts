/** Rækker fra databasen, som appen bruger (se supabase/migrations) */

export type PublicKind = 'person' | 'side' | null;

export type Profile = {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatar_path: string | null;
  is_private: boolean;
  public_kind: PublicKind;
  created_at: string;
};

export type Stance = 'enig' | 'uenig';

/** Et opslag med forfatter, tal og dine egne valg (viewet post_cards) */
export type PostCard = {
  id: string;
  kind: 'feed' | 'debat' | 'flick';
  media_type: 'image' | 'video';
  group_id: string | null;
  group_name: string | null;
  group_avatar_path: string | null;
  event_id: string | null;
  event_title: string | null;
  page_id: string | null;
  page_handle: string | null;
  page_name: string | null;
  page_avatar_path: string | null;
  text: string;
  image_paths: string[];
  tags: string[];
  allow_share: boolean;
  created_at: string;
  author_id: string;
  author_username: string;
  author_name: string;
  author_avatar_path: string | null;
  author_public_kind: PublicKind;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  my_stance: Stance | null;
  shared_post_id: string | null;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  text: string;
  created_at: string;
  author: Pick<Profile, 'id' | 'username' | 'name' | 'avatar_path'>;
  likes: number;
  liked: boolean;
};

export type NoteStatus = 'vist' | 'forslag' | 'ikke';
export type Rating = 'ja' | 'lidt' | 'nej';

export type Note = {
  id: string;
  text: string;
  sources: string[];
  created_at: string;
  status: NoteStatus;
  ratings: number;
  mine: boolean;
  my_rating: Rating | null;
  my_reasons: string[];
};

export type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };

export type NotificationRow = {
  id: string;
  type: 'follow' | 'follow_request' | 'like' | 'comment' | 'note' | 'message' | 'group_request' | 'event_invite' | 'mention' | 'mention_bio';
  post_id: string | null;
  group_id?: string | null;
  event_id?: string | null;
  created_at: string;
  read_at: string | null;
  actor: Pick<Profile, 'id' | 'username' | 'name' | 'avatar_path'> | null;
};
