import { createElement, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  acceptCall,
  declineCall,
  dismissCall,
  endText,
  flipCamera,
  fmtDuration,
  hangUp,
  listenForCalls,
  toggleCamera,
  toggleMute,
  useCall,
  type CallState,
} from '@/lib/calls';
import { useMe } from '@/lib/session';
import { color, font } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';
import { T } from './T';

/**
 * Opkald oven på hele appen: "X ringer" (tag den / afvis) og selve opkaldet i fuld skærm.
 * Monteres én gang i (app)/_layout, så man kan blive ringet op, uanset hvor man er.
 */
export function CallLayer() {
  const me = useMe();
  const call = useCall();
  useEffect(() => listenForCalls({ id: me.id, name: me.name, username: me.username, avatar_path: me.avatar_path ?? null }), [me.id, me.name, me.username, me.avatar_path]);
  if (!call) return null;
  if (call.status === 'ringing-in') return <Incoming call={call} />;
  return <CallScreen call={call} />;
}

/* ---------- Nogen ringer ---------- */

function Incoming({ call }: { call: CallState }) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(-160)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: Platform.OS !== 'web', friction: 8 }).start();
  }, [slide]);
  return (
    <Animated.View style={[s.incomingWrap, { top: insets.top + 8, transform: [{ translateY: slide }] }]} accessibilityRole="alert" accessibilityLabel={`${call.peer.name} ringer`}>
      <View style={s.incoming}>
        <Pulse size={52}>
          <Avatar name={call.peer.name} path={call.peer.avatar_path} size={52} />
        </Pulse>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="headingS" c={color.white} numberOfLines={1}>
            {call.peer.name}
          </T>
          <T v="caption" c="rgba(255,255,255,0.7)" numberOfLines={1}>
            {call.video ? 'Videoopkald' : 'Opkald'} på ciircle
          </T>
        </View>
        <RoundButton icon="close" label="Afvis" tone="danger" size={48} onPress={declineCall} />
        <RoundButton icon={call.video ? 'video' : 'phone'} label="Tag den" tone="accept" size={48} onPress={acceptCall} />
      </View>
    </Animated.View>
  );
}

/** Bølger, der pulserer ud fra profilbilledet, mens det ringer */
function Pulse({ size, children, on = true }: { size: number; children: React.ReactNode; on?: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return;
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [a, on]);
  const ring = (delay: number) => {
    const v = Animated.modulo(Animated.add(a, delay), 1);
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          s.pulse,
          { width: size, height: size, borderRadius: size / 2, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }] },
        ]}
      />
    );
  };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {on && ring(0)}
      {on && ring(0.5)}
      {children}
    </View>
  );
}

/* ---------- Selve opkaldet ---------- */

function CallScreen({ call }: { call: CallState }) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (call.status !== 'active') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [call.status]);

  const ended = call.status === 'ended';
  const showRemoteVideo = call.video && call.remoteVideo && call.status === 'active';
  const status = ended
    ? endText(call.endReason)
    : call.status === 'calling'
      ? 'Ringer…'
      : call.status === 'connecting'
        ? 'Forbinder…'
        : fmtDuration(Math.max(0, Math.round((now - (call.startedAt ?? now)) / 1000)));

  return (
    <View style={s.screen} accessibilityViewIsModal accessibilityLabel={`Opkald med ${call.peer.name}`}>
      <Backdrop />
      {/* Lyd fra den anden (og video i fuld skærm) */}
      <MediaEl stream={call.remote} style={showRemoteVideo ? s.remoteVideo : s.hidden} />

      {!showRemoteVideo && (
        <View style={[s.center, { paddingTop: insets.top + 60 }]} pointerEvents="none">
          <Pulse size={128} on={call.status === 'calling' || call.status === 'connecting'}>
            <Avatar name={call.peer.name} path={call.peer.avatar_path} size={128} />
          </Pulse>
          <T style={s.name} numberOfLines={1}>
            {call.peer.name}
          </T>
          <T v="body" c="rgba(255,255,255,0.75)" style={{ textAlign: 'center', fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite">
            {status}
          </T>
        </View>
      )}

      {showRemoteVideo && (
        <View style={[s.videoTop, { paddingTop: insets.top + 12 }]} pointerEvents="none">
          <T v="headingS" c={color.white} style={s.shadow}>
            {call.peer.name}
          </T>
          <T v="caption" c="rgba(255,255,255,0.85)" style={[s.shadow, { fontVariant: ['tabular-nums'] }]}>
            {status}
          </T>
        </View>
      )}

      {/* Dig selv i et lille vindue */}
      {call.video && call.local && !ended && (
        <View style={[s.self, { top: insets.top + 12 }]}>
          <MediaEl stream={call.local} muted mirror={call.facing === 'user'} style={StyleSheet.absoluteFill} />
          {call.cameraOff && (
            <View style={[StyleSheet.absoluteFill, s.selfOff]}>
              <Icon name="video" size={22} color="rgba(255,255,255,0.7)" />
            </View>
          )}
        </View>
      )}

      <View style={[s.controls, { paddingBottom: insets.bottom + 28 }]}>
        {ended ? (
          <RoundButton icon="close" label="Luk" tone="glass" size={64} onPress={dismissCall} caption="Luk" />
        ) : (
          <>
            {call.status !== 'calling' && <RoundButton icon="mic" label={call.muted ? 'Slå lyden til' : 'Slå lyden fra'} tone={call.muted ? 'on' : 'glass'} onPress={toggleMute} caption={call.muted ? 'Lyd fra' : 'Mikrofon'} strike={call.muted} />}
            {call.video && <RoundButton icon="video" label={call.cameraOff ? 'Tænd kamera' : 'Sluk kamera'} tone={call.cameraOff ? 'on' : 'glass'} onPress={toggleCamera} caption="Kamera" strike={call.cameraOff} />}
            {call.video && call.status === 'active' && <RoundButton icon="camera" label="Vend kamera" tone="glass" onPress={flipCamera} caption="Vend" />}
            <RoundButton icon="phone" label="Læg på" tone="danger" size={64} onPress={hangUp} caption="Læg på" hangup />
          </>
        )}
      </View>
    </View>
  );
}

function Backdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="call-bg" cx="50%" cy="30%" r="80%">
            <Stop offset="0" stopColor={color.green900} />
            <Stop offset="1" stopColor={color.ink900} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#call-bg)" />
      </Svg>
    </View>
  );
}

/** <video> i browseren (afspiller også lyden) */
function MediaEl({ stream, muted, mirror, style }: { stream: MediaStream | null; muted?: boolean; mirror?: boolean; style?: object }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (stream) el.play?.().catch(() => {});
  }, [stream]);
  if (Platform.OS !== 'web') return null;
  const flat = StyleSheet.flatten(style) as Record<string, unknown>;
  return createElement('video', {
    ref,
    autoPlay: true,
    playsInline: true,
    muted: !!muted,
    style: { ...flat, objectFit: 'cover', transform: mirror ? 'scaleX(-1)' : undefined, backgroundColor: 'transparent' },
  });
}

function RoundButton({
  icon,
  label,
  onPress,
  tone,
  size = 56,
  caption,
  strike,
  hangup,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone: 'glass' | 'on' | 'danger' | 'accept';
  size?: number;
  caption?: string;
  strike?: boolean;
  hangup?: boolean;
}) {
  const bg = tone === 'danger' ? color.danger : tone === 'accept' ? color.accent : tone === 'on' ? color.white : 'rgba(255,255,255,0.16)';
  const fg = tone === 'accept' || tone === 'on' ? color.ink900 : color.white;
  return (
    <View style={s.btnWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <View style={hangup ? { transform: [{ rotate: '135deg' }] } : undefined}>
          <Icon name={icon} size={size > 56 ? 28 : 24} color={fg} />
        </View>
        {strike && <View style={[s.strike, { backgroundColor: fg }]} />}
      </Pressable>
      {!!caption && (
        <T v="caption" c="rgba(255,255,255,0.8)">
          {caption}
        </T>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  incomingWrap: { position: 'absolute', left: 10, right: 10, zIndex: 1000, alignItems: 'center' },
  incoming: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: 26,
    backgroundColor: color.ink900,
    boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
  } as object,
  pulse: { position: 'absolute', backgroundColor: color.accent },
  screen: { ...StyleSheet.absoluteFill, zIndex: 1000, backgroundColor: color.ink900, overflow: 'hidden' } as object,
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  remoteVideo: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  center: { flex: 1, alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  name: { marginTop: 22, fontFamily: font.title, fontSize: 28, lineHeight: 34, color: color.white, textAlign: 'center' },
  videoTop: { position: 'absolute', left: 16, right: 140, gap: 2 },
  shadow: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  self: { position: 'absolute', right: 14, width: 104, height: 148, borderRadius: 18, overflow: 'hidden', backgroundColor: color.ink700, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  selfOff: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.ink700 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 22, paddingTop: 24 },
  btnWrap: { alignItems: 'center', gap: 8 },
  strike: { position: 'absolute', width: 30, height: 2.5, borderRadius: 2, transform: [{ rotate: '-45deg' }] },
});
