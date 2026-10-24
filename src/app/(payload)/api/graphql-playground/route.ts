/* THIS FILE IS PART OF THE PAYLOAD ADMIN. Keep it close to the upstream template. */
import config from '@payload-config';
import { GRAPHQL_PLAYGROUND_GET } from '@payloadcms/next/routes';

export const GET = GRAPHQL_PLAYGROUND_GET(config);
