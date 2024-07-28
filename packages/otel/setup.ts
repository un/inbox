import {
  BatchSpanProcessor,
  NodeTracerProvider
} from '@opentelemetry/sdk-trace-node';
import {
  BatchLogRecordProcessor,
  LoggerProvider
} from '@opentelemetry/sdk-logs';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { logs } from '@opentelemetry/api-logs';
import { env } from './env';

export const setupOpentelemetry = ({
  name,
  version
}: {
  name: string;
  version: string;
}) => {
  const resource = new Resource({
    'service.name': name,
    'service.version': version
  });

  const traceProvider = new NodeTracerProvider({ resource });
  traceProvider.addSpanProcessor(
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: env.OTEL_EXPORTER_TRACES_ENDPOINT
      })
    )
  );
  traceProvider.register();

  const loggerProvider = new LoggerProvider({ resource });
  loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: env.OTEL_EXPORTER_LOGS_ENDPOINT
      })
    )
  );
  logs.setGlobalLoggerProvider(loggerProvider);

  registerInstrumentations({
    instrumentations: [
      new UndiciInstrumentation(),
      new HttpInstrumentation(),
      new WinstonInstrumentation()
    ]
  });
};
