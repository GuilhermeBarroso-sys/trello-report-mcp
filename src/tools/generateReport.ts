/**
 * Tool for generating Trello board reports by quarter or year
 */

import { trelloApi } from "../trello/api";
import {
  ReportOptions,
  ReportResult,
  ReportPeriod,
  TrelloBoard,
  TrelloList,
  TrelloCard,
  TrelloMember,
  TrelloLabel,
  TrelloAction,
  BoardActivity,
} from "../trello/types";
import {
  getDateRangeForPeriod,
  formatDate,
  getPeriodDescription,
  calculateBoardActivity,
  findMostActiveList,
  findMostActiveMembers,
} from "../trello/utils";

/**
 * Generate a report for a Trello board by quarter or year
 */
export async function generateReport(options: ReportOptions): Promise<ReportResult> {
  const { boardId, boardName, period } = options;

  // Validate period
  if (!period || !period.type || !period.year) {
    throw new Error("Invalid period specified. Must include type and year.");
  }

  // Get board ID (either directly or by searching for board name)
  let targetBoardId = boardId;
  if (!targetBoardId && boardName) {
    const board = await trelloApi.findBoardByName(boardName);
    if (!board) {
      throw new Error(`Board with name "${boardName}" not found.`);
    }
    targetBoardId = board.id;
  }

  if (!targetBoardId) {
    throw new Error("Either boardId or boardName must be provided.");
  }

  // Get date range for the specified period
  const dateRange = getDateRangeForPeriod(period);

  // Fetch board data
  const boardInfo = await trelloApi.getBoard(targetBoardId);
  const lists = await trelloApi.getLists(targetBoardId);
  const cards = await trelloApi.getCards(targetBoardId);
  const members = await trelloApi.getMembers(targetBoardId);
  const labels = await trelloApi.getLabels(targetBoardId);
  const actions = await trelloApi.getActions(targetBoardId, dateRange);

  // Calculate activity metrics
  const activity = calculateBoardActivity(lists, cards, actions);

  // Generate markdown report
  const markdown = generateMarkdownReport(
    boardInfo,
    period,
    dateRange,
    lists,
    cards,
    members,
    labels,
    actions,
    activity
  );

  return {
    boardInfo,
    period,
    dateRange,
    lists,
    cards,
    members,
    labels,
    actions,
    activity,
    markdown,
  };
}

/**
 * Generate a markdown report from the collected data
 */
function generateMarkdownReport(
  board: TrelloBoard,
  period: ReportPeriod,
  dateRange: { start: Date; end: Date },
  lists: TrelloList[],
  cards: TrelloCard[],
  members: TrelloMember[],
  labels: TrelloLabel[],
  actions: TrelloAction[],
  activity: BoardActivity
): string {
  const periodDesc = getPeriodDescription(period);
  const dateRangeStr = `${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`;

  // Find active cards (cards with activity in the period)
  const activeCardIds = new Set<string>();
  actions.forEach((action) => {
    if (action.data.card?.id) {
      activeCardIds.add(action.data.card.id);
    }
  });

  const activeCards = cards.filter((card) => activeCardIds.has(card.id));

  // Find most active list and members
  const mostActiveList = findMostActiveList(activity, lists);
  const mostActiveMembers = findMostActiveMembers(activity);

  // Count cards per list
  const cardsPerList = new Map<string, number>();
  lists.forEach((list) => {
    const count = activeCards.filter((card) => card.idList === list.id).length;
    cardsPerList.set(list.id, count);
  });

  // Build the markdown report
  let markdown = `# Trello Board Report: ${board.name}\n\n`;

  // Period information
  markdown += `## Report Period: ${periodDesc}\n\n`;
  markdown += `Date Range: ${dateRangeStr}\n\n`;

  // Board overview
  markdown += `## Board Overview\n\n`;
  markdown += `- **Board Name**: ${board.name}\n`;
  if (board.desc) {
    markdown += `- **Description**: ${board.desc}\n`;
  }
  markdown += `- **URL**: ${board.url}\n`;
  markdown += `- **Last Activity**: ${new Date(board.dateLastActivity).toLocaleDateString()}\n`;
  markdown += `- **Lists**: ${lists.length}\n`;
  markdown += `- **Cards**: ${cards.length} total, ${activeCards.length} active in this period\n`;
  markdown += `- **Members**: ${members.length}\n\n`;

  // Activity summary
  markdown += `## Activity Summary\n\n`;
  markdown += `- **Cards Created**: ${activity.cardsCreated}\n`;
  markdown += `- **Cards Moved**: ${activity.cardsMoved}\n`;
  markdown += `- **Comments Added**: ${activity.commentsAdded}\n`;

  if (mostActiveList) {
    markdown += `- **Most Active List**: ${mostActiveList.name}\n`;
  }

  markdown += `\n`;

  // List breakdown
  markdown += `## List Breakdown\n\n`;
  markdown += `| List Name | Cards | Activity |\n`;
  markdown += `|-----------|-------|----------|\n`;

  lists.forEach((list) => {
    const cardCount = cardsPerList.get(list.id) || 0;
    const activityCount = activity.listActivity.get(list.id) || 0;
    markdown += `| ${list.name} | ${cardCount} | ${activityCount} |\n`;
  });

  markdown += `\n`;

  // Member activity
  if (members.length > 0) {
    markdown += `## Member Activity\n\n`;
    markdown += `| Member | Activity |\n`;
    markdown += `|--------|----------|\n`;

    mostActiveMembers.forEach(({ id, count }) => {
      const member = members.find((m) => m.id === id);
      if (member) {
        markdown += `| ${member.fullName} | ${count} |\n`;
      }
    });

    markdown += `\n`;
  }

  // Label usage
  if (labels.length > 0 && activeCards.length > 0) {
    const labelUsage = new Map<string, number>();

    labels.forEach((label) => {
      labelUsage.set(label.id, 0);
    });

    activeCards.forEach((card) => {
      card.idLabels.forEach((labelId) => {
        labelUsage.set(labelId, (labelUsage.get(labelId) || 0) + 1);
      });
    });

    // Sort labels by usage
    const sortedLabels = [...labels].sort((a, b) => {
      const usageA = labelUsage.get(a.id) || 0;
      const usageB = labelUsage.get(b.id) || 0;
      return usageB - usageA;
    });

    markdown += `## Label Usage\n\n`;
    markdown += `| Label | Color | Usage |\n`;
    markdown += `|-------|-------|-------|\n`;

    sortedLabels.forEach((label) => {
      const usage = labelUsage.get(label.id) || 0;
      if (usage > 0) {
        markdown += `| ${label.name || "(no name)"} | ${label.color} | ${usage} |\n`;
      }
    });

    markdown += `\n`;
  }

  // Card flow between lists
  if (activity.cardsMoved > 0) {
    markdown += `## Card Flow\n\n`;
    markdown += `This section shows how cards moved between lists during the period.\n\n`;

    // Find lists with card movements
    const listsWithMovements: TrelloList[] = [];
    activity.cardFlow.forEach((flowMap, sourceListId) => {
      let hasMovements = false;
      flowMap.forEach((count) => {
        if (count > 0) hasMovements = true;
      });

      if (hasMovements) {
        const list = lists.find((l) => l.id === sourceListId);
        if (list) listsWithMovements.push(list);
      }
    });

    if (listsWithMovements.length > 0) {
      listsWithMovements.forEach((sourceList) => {
        const flowMap = activity.cardFlow.get(sourceList.id);
        if (!flowMap) return;

        let totalOutflow = 0;
        flowMap.forEach((count) => {
          totalOutflow += count;
        });

        if (totalOutflow > 0) {
          markdown += `### From "${sourceList.name}"\n\n`;

          flowMap.forEach((count, targetListId) => {
            if (count > 0) {
              const targetList = lists.find((l) => l.id === targetListId);
              if (targetList) {
                markdown += `- **To "${targetList.name}"**: ${count} cards\n`;
              }
            }
          });

          markdown += `\n`;
        }
      });
    } else {
      markdown += `No significant card flow detected in this period.\n\n`;
    }
  }

  // Conclusion
  markdown += `## Summary\n\n`;
  markdown += `This report covers Trello board activity for ${board.name} during ${periodDesc} (${dateRangeStr}).\n`;
  markdown += `Total activity: ${actions.length} actions recorded.\n\n`;

  markdown += `*Report generated on ${new Date().toLocaleDateString()}*\n`;

  return markdown;
}
