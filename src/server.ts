
/**
 * MCP server implementation for Trello API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listBoards, formatBoardsAsMarkdown } from "./tools/listBoards.js";
import { generateReport } from "./tools/generateReport.js";
import { ReportPeriod } from "./trello/types.js";

/**
 * Create and configure the Trello MCP server
 */
export function createTrelloMCPServer(): McpServer {
  // Create a new MCP server
  const server = new McpServer({
    name: "trello-reports",
    description: "MCP server for generating Trello board reports by quarter or year",
    version: "1.0.0",
  });

  // Tool: List Boards
  server.tool(
    "list_boards",
    {
      searchTerm: z.string().optional().describe("Optional search term to filter boards by name"),
    },
    async ({ searchTerm }) => {
      try {
        const boards = await listBoards(searchTerm);
        const markdown = formatBoardsAsMarkdown(boards);

        return {
          content: [
            {
              type: "text",
              text: markdown,
            },
          ],
          data: {
            boards,
          },
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to list boards: ${error.message}`);
        }
        throw new Error("Failed to list boards: Unknown error");
      }
    }
  );

  // Tool: Generate Report
  server.tool(
    "generate_report",
    {
      boardId: z.string().optional().describe("ID of the Trello board"),
      boardName: z
        .string()
        .optional()
        .describe("Name of the Trello board (used if boardId is not provided)"),
      period: z
        .object({
          type: z.enum(["Q1", "Q2", "Q3", "Q4", "year"]).describe("Period type (quarter or year)"),
          year: z
            .number()
            .optional()
            .describe("Year for the report (defaults to current year if not provided)"),
        })
        .describe(`Report period in a JSON format. e.g: { "type": "Q4","year": 2024 }`),
      format: z
        .enum(["summary", "full"])
        .optional()
        .describe(
          "Report format: 'summary' for concise insights or 'full' for detailed report (default: 'full')"
        ),
    },
    async ({ boardId, boardName, period, format = "full" }) => {
      try {
        // Validate that either boardId or boardName is provided
        if (!boardId && !boardName) {
          throw new Error("Either boardId or boardName must be provided");
        }

        const result = await generateReport({
          boardId,
          boardName,
          period: {
            type: period.type as ReportPeriod["type"],
            year: period.year || new Date().getFullYear(),
          },
          format,
        });

        return {
          content: [
            {
              type: "text",
              text: result.markdown,
            },
          ],
          data: {
            boardInfo: result.boardInfo,
            period: result.period,
            dateRange: {
              start: result.dateRange.start.toISOString(),
              end: result.dateRange.end.toISOString(),
            },
          },
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to generate report: ${error.message}`);
        }
        throw new Error("Failed to generate report: Unknown error");
      }
    }
  );

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(): Promise<void> {
  const server = createTrelloMCPServer();
  const transport = new StdioServerTransport();

  console.log("Starting Trello MCP server...");
  await server.connect(transport);
  console.log("Trello MCP server connected");
}
