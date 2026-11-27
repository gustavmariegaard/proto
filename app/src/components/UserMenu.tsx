import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reportReasons } from '@/lib/profiles';
import { color } from '@/theme/tokens';
import { Button } from './Button';
import { Chip } from './Chip';
import { Item } from './PostMenu';
import { Sheet } from './Sheet';
import { T } from './T';

type Step = 'menu' | 'bloker' | 'anmeld' | 'anmeldt' | 'fjern';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Fornavn, fx "Jonas" */
  name: string;
  blocked: boolean;
  /** Personen følger dig */
  followsMe: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  onRemoveFollower: () => void;
  onReport: (reason: string) => void;
};

/** Menuen bag ⋯ på en andens profil (prototypens UserMenu): Bloker, Anmeld og Fjern følger. */
export function UserMenu({ open, onClose, name, blocked, followsMe, onBlock, onUnblock, onRemoveFollower, onReport }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('menu');
  const [reason, setReason] = useState<string | null>(null);

  const close = () => {
    onClose();
    setStep('menu');
    setReason(null);
  };

  const title =
    step === 'bloker'
      ? `Bloker ${name}?`
      : step === 'fjern'
        ? `Fjern ${name} som følger?`
        : step === 'anmeld'
          ? `Anmeld ${name}`
          : step === 'anmeldt'
            ? 'Tak for din anmeldelse'
            : name;

  const pad = { paddingBottom: 24 + insets.bottom };

  return (
    <Sheet open={open} onClose={close} title={title} initialSize="auto" dim>
      {step === 'menu' && (
        <View style={[s.list, { paddingBottom: 16 + insets.bottom }]}>
          {blocked ? (
            <Item
              icon="ban"
              label="Fjern blokering"
              onPress={() => {
                onUnblock();
                close();
              }}
            />
          ) : (
            <Item icon="ban" label="Bloker" danger onPress={() => setStep('bloker')} />
          )}
          <Item icon="flag" label="Anmeld" danger onPress={() => setStep('anmeld')} />
          {followsMe && !blocked && <Item icon="user-minus" label="Fjern følger" onPress={() => setStep('fjern')} />}
        </View>
      )}

      {step === 'bloker' && (
        <View style={[s.box, pad]}>
          <T v="bodyS" c={color.textSecondary}>
            {name} kan ikke se din profil eller skrive til dig. {name} får ikke besked.
          </T>
          <Button
            block
            onPress={() => {
              onBlock();
              close();
            }}
          >
            Bloker
          </Button>
          <Button block variant="secondary" onPress={() => setStep('menu')}>
            Annuller
          </Button>
        </View>
      )}

      {step === 'fjern' && (
        <View style={[s.box, pad]}>
          <T v="bodyS" c={color.textSecondary}>
            {name} får ikke besked.
          </T>
          <Button
            block
            onPress={() => {
              onRemoveFollower();
              close();
            }}
          >
            Fjern følger
          </Button>
          <Button block variant="secondary" onPress={() => setStep('menu')}>
            Annuller
          </Button>
        </View>
      )}

      {step === 'anmeld' && (
        <View style={[s.box, pad]}>
          <View style={s.reasons} accessibilityRole="radiogroup" accessibilityLabel="Grund">
            {reportReasons.map((r) => (
              <Chip key={r.id} selected={reason === r.id} onPress={() => setReason(r.id)}>
                {r.title}
              </Chip>
            ))}
          </View>
          <Button
            block
            disabled={!reason}
            onPress={() => {
              if (reason) onReport(reason);
              setStep('anmeldt');
            }}
          >
            Send anmeldelse
          </Button>
          <Button block variant="secondary" onPress={() => setStep('menu')}>
            Annuller
          </Button>
        </View>
      )}

      {step === 'anmeldt' && (
        <View style={[s.box, pad]}>
          <T v="bodyS" c={color.textSecondary}>
            Vi kigger på profilen. Din anmeldelse er anonym.
          </T>
          {!blocked && (
            <Button
              block
              variant="secondary"
              onPress={() => {
                onBlock();
                close();
              }}
            >
              {`Bloker ${name}`}
            </Button>
          )}
          <Button block onPress={close}>
            Færdig
          </Button>
        </View>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  list: { paddingTop: 8, paddingHorizontal: 12 },
  // .umenu: 4px 20px, 12 px mellemrum
  box: { gap: 12, paddingTop: 4, paddingHorizontal: 20 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
});
