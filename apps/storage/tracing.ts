import { setupOpentelemetry } from '@u22n/otel';
import { name, version } from './package.json';

setupOpentelemetry({ name, version });
