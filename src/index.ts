#!/usr/bin/env node

/**
 * Entry point for the Trello MCP server
 */

import { startServer } from "./server.js";

// Start the MCP server
startServer()
  .then(() => {
    console.log("MCP server started successfully");
  })
  .catch((error: Error) => {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  });
