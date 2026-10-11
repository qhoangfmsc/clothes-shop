/* Minimal Suspense boundary — visual loading handled by RouteTransition */
export default function Loading() {
  return <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />;
}
