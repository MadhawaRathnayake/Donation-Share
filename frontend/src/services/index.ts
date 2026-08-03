import { config } from '../lib/config';
import { httpServices } from './http';
import { mockServices } from './mock';

export const services = config.useMockApi ? mockServices : httpServices;
