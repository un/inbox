import { useRuntimeConfig } from '#imports';
import { db } from '@u22n/database';
import { eq } from '@u22n/database/orm';
import { domains } from '@u22n/database/schema';
import {
  eventHandler,
  getQuery,
  getRouterParam,
  send,
  setResponseStatus
} from 'h3';

export default eventHandler(async (event) => {
  const secret = getRouterParam(event, 'secret');
  if (useRuntimeConfig().platform.secret !== secret) {
    setResponseStatus(event, 401);
    return send(event, 'Unauthorized');
  }

  const domain = getQuery(event).domain;
  if (!domain || typeof domain !== 'string') {
    setResponseStatus(event, 400);
    return send(event, 'Bad Request');
  }

  if (!domain.startsWith('mta-sts.')) {
    setResponseStatus(event, 400);
    return send(event, 'Bad Request');
  }

  const rootDomain = domain.replace(/^mta-sts\./, '');
  const domainResponse = await db.query.domains.findFirst({
    where: eq(domains.domain, rootDomain)
  });

  if (!domainResponse) {
    setResponseStatus(event, 403);
    return send(event, 'Forbidden');
  }

  setResponseStatus(event, 200);
  return send(event, 'Ok');
});
