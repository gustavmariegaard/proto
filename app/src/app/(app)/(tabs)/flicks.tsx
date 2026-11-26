import { Screen } from '@/components/Screen';
import { T } from '@/components/T';

export default function FlicksPlaceholder() {
  return (
    <Screen title="Flicks" back={false} edges={['top']}>
      <T>Kommer snart</T>
    </Screen>
  );
}
