import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createLantawMcpServer } from '../../lantaw/mcp_server.mjs';

const connections = [null, null, null];
class ToolResultError extends Error {}

async function getConnection(index) {
  if (!connections[index]) connections[index] = (async () => {
    const server = createLantawMcpServer();
    const client = new Client({ name: `floodwatch-web-chat-${index + 1}`, version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return client;
  })().catch(error => { connections[index] = null; throw error; });
  return connections[index];
}

export async function callLantawTool(name, args) {
  let lastError;
  for (let index = 0; index < connections.length; index++) {
    try {
      const client = await getConnection(index);
      const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 5000 });
      const content = result.content?.find(entry => entry.type === 'text')?.text;
      const data = content ? JSON.parse(content) : {};
      if (result.isError) throw new ToolResultError(data.error || 'Lantaw data is temporarily unavailable.');
      return data;
    } catch (error) {
      if (error instanceof ToolResultError) throw error;
      lastError = error;
      const failed = connections[index];
      connections[index] = null;
      if (failed) Promise.resolve(failed).then(client => client.close()).catch(() => {});
    }
  }
  throw lastError || new Error('Lantaw MCP connections are unavailable.');
}
