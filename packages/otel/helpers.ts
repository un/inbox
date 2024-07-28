import type { Span } from '@opentelemetry/api';
import { opentelemetryEnabled } from '.';

// Import OpenTelemetry API only if it's enabled
const { trace } = opentelemetryEnabled
  ? await import('@opentelemetry/api')
  : { trace: undefined };

export function getTracer(name: string) {
  if (!trace)
    return {
      startActiveSpan: <Fn>(name: string, fn: (span?: Span) => Fn) => fn()
    };

  const tracer = trace.getTracer(name);
  return {
    startActiveSpan<Fn>(name: string, fn: (span?: Span) => Fn) {
      return tracer.startActiveSpan(name, (span) => {
        const result = fn(span);
        if (result instanceof Promise) {
          return result.finally(() => span.end());
        } else {
          span.end();
          return result;
        }
      });
    }
  };
}

export function inActiveSpan<Fn>(fn: (span?: Span) => Fn) {
  if (!trace) return fn();
  const span = trace.getActiveSpan();
  return fn(span);
}
