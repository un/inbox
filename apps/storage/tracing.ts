import { opentelemetryEnabled } from '@u22n/otel';
import { name, version } from './package.json';

if (opentelemetryEnabled) {
  const { setupOpentelemetry } = await import('@u22n/otel/setup');
  setupOpentelemetry({ name, version });
}
