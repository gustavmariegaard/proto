import { Redirect } from 'expo-router';

/** Fanen "+" åbner Opret som ark; denne side ses aldrig */
export default function NewTab() {
  return <Redirect href="/opret" />;
}
