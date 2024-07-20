export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { name, version } = await import('../package.json');
    const { setupOpentelemetry } = await import('@u22n/otel');
    setupOpentelemetry({ name, version });
  }
}
