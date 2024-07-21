import type { Span } from '@opentelemetry/api';
import { env } from './env';
import { trace } from '@opentelemetry/api';

export function getTracer(name: string) {
  if (!env.OTEL_ENABLED)
    return {
      startActiveSpan: <Fn>(name: string, fn: (span?: Span) => Fn) => fn()
    };

  const tracer = trace.getTracer(name);
  return {
    startActiveSpan<Fn>(name: string, fn: (span?: Span) => Fn) {
      if (!env.OTEL_ENABLED) return fn();
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
  if (!env.OTEL_ENABLED) return fn();
  const span = trace.getActiveSpan();
  return fn(span);
}
