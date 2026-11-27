import { router, type Href } from 'expo-router';
import { IconButton } from './IconButton';

/** Rund tilbage-knap med kant. Går ét skridt tilbage, eller til `fallback`. */
export function BackButton({ fallback = '/', onPress }: { fallback?: Href; onPress?: () => void }) {
  return (
    <IconButton
      icon="chevron-left"
      label="Tilbage"
      variant="outline"
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace(fallback)))}
    />
  );
}
