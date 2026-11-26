import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { notesFor } from '@/lib/notes';
import type { Note } from '@/lib/types';
import { color, radius, TAP } from '@/theme/tokens';
import { Icon } from './Icon';
import { NoteSources } from './NoteSources';
import { T } from './T';

/** "Læsere har tilføjet kontekst" nederst på et debatopslag (som Community Notes på X) */
export function NoteBox({ postId, refreshKey }: { postId: string; refreshKey?: number }) {
  const [note, setNote] = useState<Note | null>(null);
  // Hentes igen, når skærmen får fokus (fx efter man har skrevet en note)
  useFocusEffect(
    useCallback(() => {
      notesFor(postId).then((ns) => setNote(ns.find((n) => n.status === 'vist') ?? null));
    }, [postId, refreshKey]),
  );
  if (!note) return null;
  return (
    <View style={s.box} accessibilityLabel="Fællesskabsnote">
      <View style={s.title}>
        <Icon name="circles" size={18} />
        <T v="captionStrong">Læsere har tilføjet kontekst</T>
      </View>
      <T v="bodyS">{note.text}</T>
      <NoteSources sources={note.sources} />
      <View style={s.foot}>
        <T v="caption" c={color.textSecondary}>
          Er noten hjælpsom?
        </T>
        <Pressable accessibilityRole="button" onPress={() => router.push(`/opslag/${postId}/noter`)} style={s.rate}>
          <T v="captionStrong" style={{ textDecorationLine: 'underline' }}>
            Bedøm
          </T>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { gap: 6, paddingTop: 12, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: color.borderDefault },
  title: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: color.borderDefault, marginTop: 4 },
  rate: { minHeight: TAP, justifyContent: 'center', paddingHorizontal: 8 },
});
