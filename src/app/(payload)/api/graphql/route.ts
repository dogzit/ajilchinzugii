/* THIS FILE IS PART OF THE PAYLOAD ADMIN. Keep it close to the upstream template. */
import config from '@payload-config';
import { GRAPHQL_POST, REST_OPTIONS } from '@payloadcms/next/routes';

export const POST = GRAPHQL_POST(config);
export const OPTIONS = REST_OPTIONS(config);
