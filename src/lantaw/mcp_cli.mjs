import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
for (const name of ['.env', '.env.local']) {
  const envPath = path.join(projectRoot, name);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^(?:"(.*)"|'(.*)')$/, (_, double, single) => double ?? single);
    process.env[match[1]] ??= value;
  }
}

const { createLantawMcpServer } = await import('./mcp_server.mjs');
const server = createLantawMcpServer();
await server.connect(new StdioServerTransport());
console.error('Lantaw MCP Server is running via stdio transport.');
