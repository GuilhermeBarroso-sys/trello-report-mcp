/**
 * Tool for listing all Trello boards
 */

import { trelloApi } from "../trello/api";
import { TrelloBoard } from "../trello/types";

/**
 * List all Trello boards with optional search filter
 */
export async function listBoards(searchTerm?: string): Promise<TrelloBoard[]> {
  // Get all boards
  const boards = await trelloApi.getBoards();

  // If no search term, return all boards
  if (!searchTerm) {
    return boards;
  }

  // Filter boards by name (case-insensitive)
  const normalizedSearchTerm = searchTerm.toLowerCase();
  return boards.filter((board) => board.name.toLowerCase().includes(normalizedSearchTerm));
}

/**
 * Format board list as markdown
 */
export function formatBoardsAsMarkdown(boards: TrelloBoard[]): string {
  if (boards.length === 0) {
    return "No boards found.";
  }

  let markdown = "# Trello Boards\n\n";

  markdown += "| Board Name | ID | Last Activity |\n";
  markdown += "|------------|----|--------------|\n";

  boards.forEach((board) => {
    const lastActivity = new Date(board.dateLastActivity).toLocaleDateString();
    markdown += `| ${board.name} | ${board.id} | ${lastActivity} |\n`;
  });

  markdown += `\n*Total: ${boards.length} boards*\n`;

  return markdown;
}
