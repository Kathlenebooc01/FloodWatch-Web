import { floodwatchOpenApi } from '../../../docs/floodwatch-openapi.mjs';
import supabaseSchema from '../../../openapi.json';
import ApiDocs from './swagger-ui';

export const metadata = {
  title: 'API Documentation | FloodWatch Cebu',
  description: 'Read-only Swagger API reference for FloodWatch Cebu.',
};

export default function DocsPage() {
  return <ApiDocs nextApiSpec={floodwatchOpenApi} supabaseSpec={supabaseSchema} />;
}
