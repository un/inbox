import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions';
import {
  BatchSpanProcessor,
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
      [SEMRESATTRS_SERVICE_NAME]: name,
      [SEMRESATTRS_SERVICE_VERSION]: version
    })
  });

  provider.addSpanProcessor(new BatchSpanProcessor(new ZipkinExporter()));
  provider.register();

  registerInstrumentations({
    instrumentations: [new HttpInstrumentation()]
  });
};
