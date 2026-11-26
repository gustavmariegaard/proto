import type { ExpoConfig } from 'expo/config';

/*
 * Udvider app.json. EXPO_BASE_URL bruges kun, når web-udgaven lægges
 * under en undermappe (fx /proto/app på GitHub Pages).
 */
export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL || undefined },
});
