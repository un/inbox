import {
  type EventHandler,
  type EventHandlerRequest,
  type EventHandlerResponse,
  type H3CorsOptions,
  defineEventHandler,
  handleCors
} from 'h3';

const corsEventHandler = <
  TRequest extends EventHandlerRequest,
  TResponse extends EventHandlerResponse
>(
  handler: EventHandler<TRequest, TResponse>,
  options: H3CorsOptions
): EventHandler<EventHandlerRequest, TResponse> => {
  return defineEventHandler((event) => {
    handleCors(event, options);
    return handler(event);
  });
};

export default corsEventHandler(() => {}, {
  // allow all origins, methods, and credentials (for now)
  origin: '*',
  methods: '*',
  credentials: true
});
