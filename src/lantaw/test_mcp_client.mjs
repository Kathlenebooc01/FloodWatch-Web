import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function runDemo() {
  console.log("🔌 Initializing MCP Client connecting to Lantaw MCP Server...\n");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["src/lantaw/mcp_cli.mjs"],
  });

  const client = new Client(
    { name: "floodwatch-test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("✅ Successfully connected to Lantaw MCP Server via Stdio!\n");

  // 1. List available tools exposed by Lantaw MCP Server
  console.log("📋 Requesting tools/list from Lantaw MCP Server:");
  const tools = await client.listTools();
  tools.tools.forEach((tool, index) => {
    console.log(`   ${index + 1}. [${tool.name}] - ${tool.description}`);
  });

  console.log("\n--------------------------------------------------------------\n");

  // 2. Call a tool: detect_duplicate_inventory
  console.log("🧪 Calling Tool: 'detect_duplicate_inventory'...");
  const duplicateCheck = await client.callTool({
    name: "detect_duplicate_inventory",
    arguments: {
      item_name: "Life Jacket",
      existing_items: ["Life Vest", "Generator Set 5kW", "Rubber Boat"],
    },
  });

  console.log("📥 Result from MCP Server:");
  console.log(duplicateCheck.content[0].text);

  console.log("\n--------------------------------------------------------------\n");

  // 3. Call a tool: query_floodwatch_utilities from Supabase
  console.log("🧪 Calling Tool: 'query_floodwatch_utilities'...");
  const utilitiesResult = await client.callTool({
    name: "query_floodwatch_utilities",
    arguments: {
      limit: 3,
    },
  });

  console.log("📥 Result from MCP Server:");
  console.log(utilitiesResult.content[0].text);

  console.log("\n--------------------------------------------------------------\n");

  // 4. Call a tool: analyze_and_prioritize_requests with weather telemetry
  console.log("🧪 Calling Tool: 'analyze_and_prioritize_requests'...");
  const prioritizeResult = await client.callTool({
    name: "analyze_and_prioritize_requests",
    arguments: {
      scope: "Cebu Province",
    },
  });

  console.log("📥 Result from MCP Server:");
  console.log(prioritizeResult.content[0].text);

  console.log("\n🎉 MCP integration demo finished successfully!");
  process.exit(0);
}

runDemo().catch((err) => {
  console.error("❌ MCP Demo Error:", err);
  process.exit(1);
});
