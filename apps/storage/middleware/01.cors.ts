import {
  type EventHandler,
  type EventHandlerRequest,
  type EventHandlerResponse,
  type H3CorsOptions,
  defineEventHandler,
  getRequestURL,
  handleCors
} from 'h3';
import { useRuntimeConfig } from '#imports';

const corsEventHandler = <
  TRequest extends EventHandlerRequest,
  TResponse extends EventHandlerResponse
>(
  handler: EventHandler<TRequest, TResponse>,
  options: H3CorsOptions
): EventHandler<EventHandlerRequest, TResponse> => {
  return defineEventHandler((event) => {
    if (!getRequestURL(event).pathname.startsWith('/api')) {
      return handler(event);
    }
    handleCors(event, options);
    return handler(event);
  });
};

const webAppUrl = useRuntimeConfig().webapp.url;
export default corsEventHandler(() => {}, {
  origin: webAppUrl,
  methods: '*',
  credentials: true
});
