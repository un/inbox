// TODO: add OpenTelemetry exporter

import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { Resource } from '@opentelemetry/resources';
import {
  // BatchSpanProcessor,
  NodeTracerProvider
} from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { env } from './env';

export const setupTracer = ({
  name,
  version
}: {
  name: string;
  version: string;
}) => {
  if (!env.OTEL_ENABLED) return;
  const provider = new NodeTracerProvider({
    resource: new Resource({
      'service.name': name,
      'service.version': version
    })
  });

  // provider.addSpanProcessor(new BatchSpanProcessor(EXPORTER));
  provider.register();

  registerInstrumentations({
    instrumentations: [new HttpInstrumentation()]
  });
};
