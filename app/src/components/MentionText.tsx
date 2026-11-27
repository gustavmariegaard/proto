import type { ComponentProps } from 'react';
import { openMention, splitMentions } from '@/lib/mentions';
import { useMe } from '@/lib/session';
import { font } from '@/theme/tokens';
import { T } from './T';

type Props = Omit<ComponentProps<typeof T>, 'children'> & {
  children: string;
  /** Farven på @tags (standard: samme som teksten) */
  linkColor?: string;
};

/** Tekst, hvor @personer og @sider kan trykkes på */
export function MentionText({ children, linkColor, ...rest }: Props) {
  const me = useMe();
  const parts = splitMentions(children);
  if (!parts.some((p) => p.handle)) return <T {...rest}>{children}</T>;
  return (
    <T {...rest}>
      {parts.map((p, i) =>
        p.handle ? (
          <T
            key={i}
            v={rest.v}
            c={linkColor ?? rest.c}
            style={[rest.style, { fontFamily: font.bodySemi }]}
            accessibilityRole="link"
            onPress={() => openMention(p.handle!, me.username)}
          >
            {p.text}
          </T>
        ) : (
          p.text
        ),
      )}
    </T>
  );
}
