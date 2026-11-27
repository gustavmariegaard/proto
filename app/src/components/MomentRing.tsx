import { MomentBubble } from './MomentBubble';

type Props = {
  name: string;
  /** Tekst under boblen (fx "Dig" eller brugernavn) */
  label: string;
  avatarPath?: string | null;
  avatarUri?: string;
  /** Grøn ring = usete moments, grå = sete, ingen = ingen moments */
  state: 'unseen' | 'seen' | 'none';
  /** Lille + nederst til højre (Dig: lav et moment) */
  plus?: boolean;
  onPress: () => void;
  onPlus?: () => void;
};

/** Moment-rækken på Hjem: prototypens MomentBubble med appens data */
export function MomentRing({ name, label, avatarPath, avatarUri, state, plus, onPress, onPlus }: Props) {
  return (
    <MomentBubble
      name={label}
      fullName={name}
      state={state === 'unseen' ? 'new' : state === 'seen' ? 'seen' : 'add'}
      path={avatarPath}
      uri={avatarUri}
      plus={plus}
      onPress={onPress}
      onPlus={onPlus}
    />
  );
}
