import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createLantawMcpServer } from '../../lantaw/mcp_server.mjs';

let connection;
export async function callLantawTool(name, args) {
  if (!connection) connection = (async () => {
    const server = createLantawMcpServer();
    const client = new Client({ name: 'floodwatch-web-chat', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return client;
  })().catch(error => { connection = null; throw error; });
  const client = await connection;
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 15000 });
  const content = result.content?.find(entry => entry.type === 'text')?.text;
  const data = content ? JSON.parse(content) : {};
  if (result.isError) throw new Error(data.error || 'Lantaw data is temporarily unavailable.');
  return data;
}
