/**
 * Tool for generating Trello board reports by quarter or year
 */

import { trelloApi } from "../trello/api.js";
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
} from "../trello/types.js";
import {
  getDateRangeForPeriod,
  formatDate,
  getPeriodDescription,
  calculateBoardActivity,
  findMostActiveList,
  findMostActiveMembers,
  groupCardsByLabel,
  findTopCards,
  findCompletedCards,
  findInProgressCards,
  generateWorkSummary,
  generateReportSummary,
} from "../trello/utils.js";

/**
 * Generate a report for a Trello board by quarter or year
 */
export async function generateReport(options: ReportOptions): Promise<ReportResult> {
  const { boardId, boardName, period, format = "full" } = options;

  // Validate period
  if (!period || !period.type || !period.year) {
    throw new Error("Invalid period specified. Must include type and year.");
  }

  // Validate format
  if (format !== "summary" && format !== "full") {
    throw new Error("Invalid format specified. Must be 'summary' or 'full'.");
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

  // Process cards for enhanced report
  activity.cardsByLabel = groupCardsByLabel(cards, labels);
  activity.topCards = findTopCards(cards, actions, 15); // Increased from 10 to 15 cards
  activity.completedCards = findCompletedCards(cards, actions);
  activity.inProgressCards = findInProgressCards(cards, lists);

  // Fetch additional card details (checklists) for top cards
  // Increased from 5 to 15 cards for better coverage
  for (const card of activity.topCards.slice(0, 15)) {
    try {
      const checklists = await trelloApi.getCardChecklists(card.id);
      activity.cardChecklists.set(card.id, checklists);
    } catch (error) {
      console.error(`Error fetching details for card ${card.id}:`, error);
    }
  }

  // Generate markdown report based on format
  let markdown: string;

  if (format === "summary") {
    // Generate summary report
    markdown = generateReportSummary(
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
  } else {
    // Generate full detailed report
    markdown = generateMarkdownReport(
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
  }

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

    mostActiveMembers.forEach(({ id, count }: { id: string; count: number }) => {
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
      card.idLabels.forEach((labelId: string) => {
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
    activity.cardFlow.forEach((flowMap: Map<string, number>, sourceListId: string) => {
      let hasMovements = false;
      flowMap.forEach((count: number) => {
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
        flowMap.forEach((count: number) => {
          totalOutflow += count;
        });

        if (totalOutflow > 0) {
          markdown += `### From "${sourceList.name}"\n\n`;

          flowMap.forEach((count: number, targetListId: string) => {
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

  // Work Summary Section
  markdown += `## Work Summary\n\n`;
  markdown += generateWorkSummary(activity.completedCards, labels, activity.cardsByLabel);
  markdown += `\n\n`;

  // Completed Features Section
  if (activity.completedCards.length > 0) {
    markdown += `## Completed Features\n\n`;

    // Group completed cards by label
    const completedCardsByLabel = new Map<string, TrelloCard[]>();

    labels.forEach((label) => {
      if (!label.name) return; // Skip labels without names

      const labelCards = activity.cardsByLabel.get(label.id) || [];
      const completedLabelCards = labelCards.filter((card: TrelloCard) =>
        activity.completedCards.some((c: TrelloCard) => c.id === card.id)
      );

      if (completedLabelCards.length > 0) {
        completedCardsByLabel.set(label.id, completedLabelCards);
      }
    });

    // Display completed cards by label
    labels.forEach((label) => {
      const completedLabelCards = completedCardsByLabel.get(label.id) || [];

      if (completedLabelCards.length > 0 && label.name) {
        markdown += `### ${label.name} (${completedLabelCards.length})\n\n`;

        completedLabelCards.forEach((card) => {
          markdown += `- **${card.name}**`;

          // Add card description (truncated if too long)
          if (card.desc) {
            const shortDesc =
              card.desc.length > 100 ? card.desc.substring(0, 100) + "..." : card.desc;
            markdown += `: ${shortDesc}`;
          }

          markdown += ` [View Card](${card.url})\n`;
        });

        markdown += `\n`;
      }
    });
  }

  // Top Cards Section
  if (activity.topCards.length > 0) {
    markdown += `## Key Cards\n\n`;
    markdown += `These cards had the most activity during this period:\n\n`;

    activity.topCards.slice(0, 10).forEach((card: TrelloCard, index: number) => {
      markdown += `### ${index + 1}. ${card.name}\n\n`;

      // Card details
      markdown += `- **List**: ${lists.find((l) => l.id === card.idList)?.name || "Unknown"}\n`;

      // Card members
      const cardMembers = members.filter((m) => card.idMembers.includes(m.id));
      if (cardMembers.length > 0) {
        markdown += `- **Assigned to**: ${cardMembers.map((m) => m.fullName).join(", ")}\n`;
      }

      // Card labels
      const cardLabels = labels.filter((l) => card.idLabels.includes(l.id));
      if (cardLabels.length > 0) {
        markdown += `- **Labels**: ${cardLabels.map((l) => l.name || l.color).join(", ")}\n`;
      }

      // Due date
      if (card.due) {
        const dueDate = new Date(card.due);
        markdown += `- **Due**: ${dueDate.toLocaleDateString()} ${
          card.dueComplete ? "(Completed)" : ""
        }\n`;
      }

      // Description
      if (card.desc) {
        markdown += `\n**Description**:\n\n${card.desc}\n\n`;
      }

      markdown += `[View Card on Trello](${card.url})\n\n`;
    });
  }

  // In Progress Work Section
  if (activity.inProgressCards.length > 0) {
    markdown += `## Work In Progress\n\n`;

    // Group in-progress cards by list
    const cardsByList = new Map<string, TrelloCard[]>();

    lists.forEach((list) => {
      const listCards = activity.inProgressCards.filter((card: TrelloCard) => card.idList === list.id);
      if (listCards.length > 0) {
        cardsByList.set(list.id, listCards);
      }
    });

    // Display in-progress cards by list
    lists.forEach((list) => {
      const listCards = cardsByList.get(list.id) || [];

      if (listCards.length > 0) {
        markdown += `### ${list.name} (${listCards.length})\n\n`;

        listCards.forEach((card) => {
          // Card labels
          const cardLabels = labels.filter((l) => card.idLabels.includes(l.id));
          const labelText =
            cardLabels.length > 0
              ? ` [${cardLabels.map((l) => l.name || l.color).join(", ")}]`
              : "";

          markdown += `- **${card.name}**${labelText}`;

          // Due date
          if (card.due) {
            const dueDate = new Date(card.due);
            markdown += ` (Due: ${dueDate.toLocaleDateString()})`;
          }

          markdown += `\n`;
        });

        markdown += `\n`;
      }
    });
  }

  // Conclusion
  markdown += `## Summary\n\n`;
  markdown += `This report covers Trello board activity for ${board.name} during ${periodDesc} (${dateRangeStr}).\n`;
  markdown += `Total activity: ${actions.length} actions recorded.\n\n`;

  markdown += `*Report generated on ${new Date().toLocaleDateString()}*\n`;

  return markdown;
}
