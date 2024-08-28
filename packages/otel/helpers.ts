import type { Span } from '@opentelemetry/api';
import { opentelemetryEnabled } from '.';

// Import OpenTelemetry API only if it's enabled
const { trace } = opentelemetryEnabled
  ? await import('@opentelemetry/api')
  : { trace: undefined };

const { wrapTracer } = opentelemetryEnabled
  ? await import('@opentelemetry/api/experimental')
  : { wrapTracer: undefined };

export function getTracer(name: string) {
  if (!trace || !wrapTracer)
    return {
      startActiveSpan: <Fn>(name: string, fn: (span?: Span) => Fn) => fn()
    };
  const tracer = wrapTracer(trace.getTracer(name));
  return {
    startActiveSpan: tracer.withActiveSpan.bind(tracer)
  };
}

export function inActiveSpan<Fn>(fn: (span?: Span) => Fn) {
  if (!trace) return fn();
  const span = trace.getActiveSpan();
  return fn(span);
}
