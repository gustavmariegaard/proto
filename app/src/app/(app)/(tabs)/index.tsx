import { Screen } from '@/components/Screen';
import { T } from '@/components/T';

export default function Placeholder() {
  return (
    <Screen title="Hjem" back={false}>
      <T>Kommer snart</T>
    </Screen>
  );
}
