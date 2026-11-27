import { Screen } from '@/components/Screen';
import { TopicsEditor } from '@/components/TopicsSheet';

/** Rediger interesser (fra Indstillinger): samme indhold som arket i Offentlig debat */
export default function Interests() {
  return (
    <Screen title="Rediger interesser" contentStyle={{ padding: 0, paddingTop: 0, paddingBottom: 0, gap: 0 }}>
      <TopicsEditor />
    </Screen>
  );
}
