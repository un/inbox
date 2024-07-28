export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { opentelemetryEnabled } = await import('@u22n/otel');

    if (opentelemetryEnabled) {
      const { name, version } = await import('../package.json');
      const { setupOpentelemetry } = await import('@u22n/otel/setup');
      setupOpentelemetry({ name, version });
    }
  }
}
