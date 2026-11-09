export function readFirebaseConfig(env) {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY?.trim(),
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: env.VITE_FIREBASE_PROJECT_ID?.trim(),
    appId: env.VITE_FIREBASE_APP_ID?.trim(),
  };
  const values = Object.values(config);
  const measurementId = env.VITE_FIREBASE_MEASUREMENT_ID?.trim();
  if (measurementId) config.measurementId = measurementId;
  return { config: values.every(Boolean) ? config : null };
}
