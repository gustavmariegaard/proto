import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { fmtNumber } from '@/lib/time';
import { color, font, momentRing, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { MentionText } from './MentionText';
import { T } from './T';

const RING = 88;
const BANNER = 84;

type Props = {
  name: string;
  username: string;
  avatarPath?: string | null;
  /** new = grøn ring, seen = grå ring, none = ingen ring */
  ring: 'new' | 'seen' | 'none';
  /** Tryk på billedet (se moment / lav et moment) */
  onRing?: () => void;
  ringLabel?: string;
  /** Lille plus på billedet (din egen profil uden moment) */
  plus?: boolean;
  /** Mærker under brugernavnet (Privat, Følger dig …) */
  badges?: ReactNode;
  bio?: string | null;
  /** Tallene. onPress gør tallet trykbart (fx Følgere og Følger). */
  stats: { n: number; label: string; onPress?: () => void }[];
  /** Øverst til højre på banneret (fx Indstillinger) */
  corner?: ReactNode;
  /** Til højre for billedet (fx Rediger profil) */
  action?: ReactNode;
  /** Nederst i kortet (fx Følg og Besked) */
  children?: ReactNode;
  /** Allernederst i kortet, under en streg (fx Indsigt) */
  footer?: ReactNode;
};

/**
 * Toppen af en profil (din egen og andres): ét kort med et blødt grønt banner,
 * billedet der stikker op i banneret, navn i fuld bredde, bio og tallene i én rolig linje.
 */
export function ProfileCard({ name, username, avatarPath, ring, onRing, ringLabel, plus, badges, bio, stats, corner, action, children, footer }: Props) {
  const pic = (
    <View style={[s.ring, ring === 'new' && s.ringNew, ring === 'seen' && s.ringSeen]}>
      <Avatar name={name} path={avatarPath} size={RING - 2 * (momentRing.width + momentRing.gap)} tone="blue" />
      {plus && (
        <View style={s.plus}>
          <Icon name="plus" size={16} color={color.textOnAction} stroke={2.5} />
        </View>
      )}
    </View>
  );
  return (
    <View style={s.card} accessibilityLabel={`Profil: ${name}`}>
      <Svg style={s.banner} width="100%" height={BANNER} pointerEvents="none">
        <Defs>
          <LinearGradient id="pc-banner" x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor={color.accentHighlight} stopOpacity="0.5" />
            <Stop offset="0.55" stopColor={color.accentNoteBg} stopOpacity="1" />
            <Stop offset="1" stopColor={color.bgSurface} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#pc-banner)" />
      </Svg>
      {corner && <View style={s.corner}>{corner}</View>}

      <View style={s.body}>
        <View style={s.top}>
          {onRing ? (
            <Pressable accessibilityRole="button" accessibilityLabel={ringLabel} onPress={onRing} style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}>
              {pic}
            </Pressable>
          ) : (
            pic
          )}
          <View style={{ flex: 1 }} />
          {action}
        </View>

        <View style={s.name}>
          <T v="titleL" accessibilityRole="header">
            {name}
          </T>
          <T v="caption" c={color.textSecondary}>
            @{username}
          </T>
          {badges && <View style={s.badges}>{badges}</View>}
        </View>

        {!!bio?.trim() && <MentionText v="bodyS">{bio.trim()}</MentionText>}

        <View style={s.stats}>
          {stats.map((st) => {
            const text = (
              <T v="bodyS" c={color.textSecondary} accessibilityLabel={st.onPress ? undefined : `${fmtNumber(st.n)} ${st.label}`}>
                <T v="bodyS" style={s.num}>
                  {fmtNumber(st.n)}
                </T>{' '}
                {st.label.toLowerCase()}
              </T>
            );
            return st.onPress ? (
              <Pressable
                key={st.label}
                accessibilityRole="link"
                accessibilityLabel={`${fmtNumber(st.n)} ${st.label}. Se listen`}
                onPress={st.onPress}
                hitSlop={8}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                {text}
              </Pressable>
            ) : (
              <View key={st.label}>{text}</View>
            );
          })}
        </View>

        {children}
        {footer}
      </View>
    </View>
  );
}

/** Lille mærke under navnet, fx "Privat" eller "Følger dig" */
export function ProfileBadge({ icon, children, tone = 'plain', onPress }: { icon?: 'lock' | 'globe' | 'building'; children: string; tone?: 'plain' | 'note'; onPress?: () => void }) {
  const fg = tone === 'note' ? color.accentNoteText : color.textSecondary;
  return (
    <Pressable accessibilityRole={onPress ? 'link' : undefined} disabled={!onPress} onPress={onPress} style={[s.badge, tone === 'note' && s.badgeNote]}>
      {icon && <Icon name={icon} size={12} color={fg} />}
      <T v="captionStrong" c={fg}>
        {children}
      </T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  banner: { position: 'absolute', top: 0, left: 0, right: 0, height: BANNER },
  corner: { position: 'absolute', top: 6, right: 6, zIndex: 2 },
  body: { paddingTop: BANNER - RING / 2, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: momentRing.width,
    borderColor: color.bgSurface,
    backgroundColor: color.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringNew: { borderColor: color.accentHighlight },
  ringSeen: { borderColor: color.borderStrong },
  plus: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: color.bgSurface,
    backgroundColor: color.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: color.bgSubtle },
  badgeNote: { backgroundColor: color.accentNoteBg },
  stats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
  num: { fontFamily: font.bodyBold, color: color.textPrimary },
});
