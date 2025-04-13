/**
 * Utility functions for Trello API and report generation
 */

import { format, parse, startOfYear, endOfYear, addMonths, subDays } from "date-fns";
import {
  DateRange,
  ReportPeriod,
  TrelloAction,
  TrelloCard,
  TrelloList,
  TrelloLabel,
  TrelloComment,
  TrelloChecklist,
  TrelloBoard,
  TrelloMember,
  BoardActivity,
} from "./types";

/**
 * Get date range for a report period
 */
export function getDateRangeForPeriod(period: ReportPeriod): DateRange {
  const { type, year } = period;
  const currentYear = new Date().getFullYear();
  const targetYear = year || currentYear;

  if (type === "year") {
    return {
      start: startOfYear(new Date(targetYear, 0, 1)),
      end: endOfYear(new Date(targetYear, 0, 1)),
    };
  }

  // Handle quarters
  const quarterMap: Record<string, number> = {
    Q1: 0, // January
    Q2: 3, // April
    Q3: 6, // July
    Q4: 9, // October
  };

  const quarterStartMonth = quarterMap[type];
  const start = new Date(targetYear, quarterStartMonth, 1);
  const end = subDays(addMonths(start, 3), 0); // Last day of the quarter

  return { start, end };
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Get a human-readable description of a report period
 */
export function getPeriodDescription(period: ReportPeriod): string {
  const { type, year } = period;

  if (type === "year") {
    return `Year ${year}`;
  }

  const quarterNames: Record<string, string> = {
    Q1: "First Quarter",
    Q2: "Second Quarter",
    Q3: "Third Quarter",
    Q4: "Fourth Quarter",
  };

  return `${quarterNames[type]} ${year}`;
}

/**
 * Calculate board activity metrics from actions
 */
export function calculateBoardActivity(
  lists: TrelloList[],
  cards: TrelloCard[],
  actions: TrelloAction[]
): BoardActivity {
  const activity: BoardActivity = {
    cardsCreated: 0,
    cardsCompleted: 0,
    cardsMoved: 0,
    commentsAdded: 0,
    membersActive: new Map<string, number>(),
    listActivity: new Map<string, number>(),
    cardFlow: new Map<string, Map<string, number>>(),
    // Initialize card-focused metrics
    cardsByLabel: new Map<string, TrelloCard[]>(),
    topCards: [],
    completedCards: [],
    inProgressCards: [],
    cardChecklists: new Map<string, TrelloChecklist[]>(),
  };

  // Initialize list activity counters
  lists.forEach((list) => {
    activity.listActivity.set(list.id, 0);

    // Initialize card flow map for this list
    const flowMap = new Map<string, number>();
    lists.forEach((targetList) => {
      if (targetList.id !== list.id) {
        flowMap.set(targetList.id, 0);
      }
    });
    activity.cardFlow.set(list.id, flowMap);
  });

  // Process actions
  actions.forEach((action) => {
    // Track active members
    const memberId = action.idMemberCreator;
    activity.membersActive.set(memberId, (activity.membersActive.get(memberId) || 0) + 1);

    // Process by action type
    switch (action.type) {
      case "createCard":
        activity.cardsCreated++;
        if (action.data.list) {
          const listId = action.data.list.id;
          activity.listActivity.set(listId, (activity.listActivity.get(listId) || 0) + 1);
        }
        break;

      case "updateCard":
        if (action.data.listBefore && action.data.listAfter) {
          activity.cardsMoved++;

          const sourceListId = action.data.listBefore.id;
          const targetListId = action.data.listAfter.id;

          // Update list activity
          activity.listActivity.set(
            sourceListId,
            (activity.listActivity.get(sourceListId) || 0) + 1
          );
          activity.listActivity.set(
            targetListId,
            (activity.listActivity.get(targetListId) || 0) + 1
          );

          // Update card flow
          const flowMap = activity.cardFlow.get(sourceListId);
          if (flowMap) {
            flowMap.set(targetListId, (flowMap.get(targetListId) || 0) + 1);
          }
        }
        break;

      case "commentCard":
        activity.commentsAdded++;
        break;

      default:
        // Other action types not specifically tracked
        break;
    }
  });

  return activity;
}

/**
 * Convert a Map to a regular object for JSON serialization
 */
export function mapToObject<K extends string | number, V>(map: Map<K, V>): Record<K, V> {
  const obj = {} as Record<K, V>;
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

/**
 * Find the most active list (list with most card movements)
 */
export function findMostActiveList(
  activity: BoardActivity,
  lists: TrelloList[]
): TrelloList | null {
  let maxActivity = 0;
  let mostActiveListId: string | null = null;

  activity.listActivity.forEach((count, listId) => {
    if (count > maxActivity) {
      maxActivity = count;
      mostActiveListId = listId;
    }
  });

  if (!mostActiveListId) return null;

  return lists.find((list) => list.id === mostActiveListId) || null;
}

/**
 * Find the most active members
 */
export function findMostActiveMembers(
  activity: BoardActivity,
  limit: number = 5
): Array<{ id: string; count: number }> {
  const members: Array<{ id: string; count: number }> = [];

  activity.membersActive.forEach((count, id) => {
    members.push({ id, count });
  });

  return members.sort((a, b) => b.count - a.count).slice(0, limit);
}

/**
 * Group cards by their labels
 */
export function groupCardsByLabel(
  cards: TrelloCard[],
  labels: TrelloLabel[]
): Map<string, TrelloCard[]> {
  const cardsByLabel = new Map<string, TrelloCard[]>();

  // Initialize with empty arrays for all labels
  labels.forEach((label) => {
    cardsByLabel.set(label.id, []);
  });

  // Add cards to their respective label groups
  cards.forEach((card) => {
    card.idLabels.forEach((labelId) => {
      const labelCards = cardsByLabel.get(labelId) || [];
      labelCards.push(card);
      cardsByLabel.set(labelId, labelCards);
    });
  });

  return cardsByLabel;
}

/**
 * Find the most significant cards based on activity
 */
export function findTopCards(
  cards: TrelloCard[],
  actions: TrelloAction[],
  limit: number = 10
): TrelloCard[] {
  // Count actions per card
  const cardActionCounts = new Map<string, number>();

  actions.forEach((action) => {
    if (action.data.card?.id) {
      const cardId = action.data.card.id;
      cardActionCounts.set(cardId, (cardActionCounts.get(cardId) || 0) + 1);
    }
  });

  // Sort cards by action count
  return [...cards]
    .filter((card) => cardActionCounts.has(card.id))
    .sort((a, b) => {
      const countA = cardActionCounts.get(a.id) || 0;
      const countB = cardActionCounts.get(b.id) || 0;
      return countB - countA;
    })
    .slice(0, limit);
}

/**
 * Identify completed cards (cards that were moved to a completion list)
 */
export function findCompletedCards(
  cards: TrelloCard[],
  actions: TrelloAction[],
  completionListNames: string[] = ["Done", "Completed", "Finished"]
): TrelloCard[] {
  // Find completion list IDs
  const completionListIds = new Set<string>();

  actions.forEach((action) => {
    if (
      action.type === "updateCard" &&
      action.data.listAfter &&
      completionListNames.some((name) =>
        action.data.listAfter!.name.toLowerCase().includes(name.toLowerCase())
      )
    ) {
      completionListIds.add(action.data.listAfter.id);
    }
  });

  // Find cards that were moved to completion lists
  const completedCardIds = new Set<string>();

  actions.forEach((action) => {
    if (
      action.type === "updateCard" &&
      action.data.listAfter &&
      completionListIds.has(action.data.listAfter.id) &&
      action.data.card?.id
    ) {
      completedCardIds.add(action.data.card.id);
    }
  });

  return cards.filter((card) => completedCardIds.has(card.id));
}

/**
 * Identify cards that are currently in progress
 */
export function findInProgressCards(
  cards: TrelloCard[],
  lists: TrelloList[],
  inProgressListNames: string[] = ["In Progress", "Doing", "Working", "Current Sprint"]
): TrelloCard[] {
  // Find in-progress list IDs
  const inProgressListIds = lists
    .filter((list) =>
      inProgressListNames.some((name) => list.name.toLowerCase().includes(name.toLowerCase()))
    )
    .map((list) => list.id);

  // Find cards in in-progress lists
  return cards.filter((card) => inProgressListIds.includes(card.idList));
}

/**
 * Generate a natural language summary of the work done
 */
export function generateWorkSummary(
  completedCards: TrelloCard[],
  labels: TrelloLabel[],
  cardsByLabel: Map<string, TrelloCard[]>
): string {
  if (completedCards.length === 0) {
    return "No work was completed during this period.";
  }

  let summary = `During this period, the team completed ${completedCards.length} cards. `;

  // Summarize by label
  const labelSummaries: string[] = [];

  labels.forEach((label) => {
    const labelCards = cardsByLabel.get(label.id) || [];
    const completedLabelCards = labelCards.filter((card) =>
      completedCards.some((c) => c.id === card.id)
    );

    if (completedLabelCards.length > 0 && label.name) {
      labelSummaries.push(`${completedLabelCards.length} ${label.name} items`);
    }
  });

  if (labelSummaries.length > 0) {
    summary += "This included " + labelSummaries.join(", ") + ". ";
  }

  // Add information about most significant completed cards
  if (completedCards.length > 0) {
    summary += "Key completed items include: ";
    const topCompletedCards = completedCards.slice(0, 3);

    summary += topCompletedCards.map((card) => `"${card.name}"`).join(", ");

    summary += ".";
  }

  return summary;
}

/**
 * Generate a comprehensive report summary with insights
 */
export function generateReportSummary(
  board: TrelloBoard,
  period: ReportPeriod,
  dateRange: DateRange,
  lists: TrelloList[],
  cards: TrelloCard[],
  members: TrelloMember[],
  labels: TrelloLabel[],
  actions: TrelloAction[],
  activity: BoardActivity
): string {
  const periodDesc = getPeriodDescription(period);
  const dateRangeStr = `${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`;
  const mostActiveList = findMostActiveList(activity, lists);

  // Find active cards (cards with activity in the period)
  const activeCardIds = new Set<string>();
  actions.forEach((action) => {
    if (action.data.card?.id) {
      activeCardIds.add(action.data.card.id);
    }
  });
  const activeCards = cards.filter((card) => activeCardIds.has(card.id));

  // Start building the summary
  let summary = `# ${board.name} - ${periodDesc} Summary\n\n`;

  // Overall stats
  summary += `## Overall Activity\n\n`;
  summary += `During ${periodDesc} (${dateRangeStr}), the team recorded ${actions.length} activities across ${activeCards.length} cards. `;
  summary += `There were ${activity.cardsCreated} new cards created, ${activity.cardsMoved} card movements, and ${activity.commentsAdded} comments added.\n\n`;

  // Team activity
  if (activity.membersActive.size > 0) {
    const mostActiveMembers = findMostActiveMembers(activity, 3);
    if (mostActiveMembers.length > 0) {
      summary += `## Team Activity\n\n`;
      summary += `The most active team members were: `;

      const memberNames = mostActiveMembers.map(({ id }) => {
        const member = members.find((m) => m.id === id);
        return member ? member.fullName : "Unknown Member";
      });

      summary += memberNames.join(", ");
      summary += `.\n\n`;
    }
  }

  // Work completed
  const workSummary = generateWorkSummary(activity.completedCards, labels, activity.cardsByLabel);
  summary += `## Work Completed\n\n${workSummary}\n\n`;

  // Key cards
  if (activity.topCards.length > 0) {
    summary += `## Key Focus Areas\n\n`;
    summary += `The team focused primarily on these items:\n\n`;

    activity.topCards.slice(0, 3).forEach((card, index) => {
      const cardList = lists.find((l) => l.id === card.idList);
      const cardLabels = labels.filter((l) => card.idLabels.includes(l.id));
      const labelText =
        cardLabels.length > 0 ? ` (${cardLabels.map((l) => l.name || l.color).join(", ")})` : "";

      summary += `${index + 1}. **${card.name}**${labelText} - ${
        cardList?.name || "Unknown List"
      }\n`;
    });

    summary += `\n`;
  }

  // Workflow analysis
  if (activity.cardsMoved > 0 && mostActiveList) {
    summary += `## Workflow Analysis\n\n`;
    summary += `The most active list was "${mostActiveList.name}", indicating this was a key stage in the workflow. `;

    // Identify potential bottlenecks
    const listActivity = [...activity.listActivity.entries()].sort((a, b) => b[1] - a[1]);
    if (listActivity.length >= 2) {
      const secondMostActiveListId = listActivity[1][0];
      const secondMostActiveList = lists.find((l) => l.id === secondMostActiveListId);

      if (secondMostActiveList) {
        summary += `"${secondMostActiveList.name}" also saw significant activity.\n\n`;
      }
    }
  }

  // Work in progress
  if (activity.inProgressCards.length > 0) {
    summary += `## Current Work\n\n`;
    summary += `There ${activity.inProgressCards.length === 1 ? "is" : "are"} currently ${
      activity.inProgressCards.length
    } ${activity.inProgressCards.length === 1 ? "card" : "cards"} in progress. `;

    // Group by list
    const inProgressByList = new Map<string, TrelloCard[]>();
    lists.forEach((list) => {
      const listCards = activity.inProgressCards.filter((card) => card.idList === list.id);
      if (listCards.length > 0) {
        inProgressByList.set(list.id, listCards);
      }
    });

    if (inProgressByList.size > 0) {
      const listSummaries: string[] = [];

      inProgressByList.forEach((cards, listId) => {
        const list = lists.find((l) => l.id === listId);
        if (list) {
          listSummaries.push(`${cards.length} in "${list.name}"`);
        }
      });

      if (listSummaries.length > 0) {
        summary += `This includes ${listSummaries.join(", ")}.\n\n`;
      }
    }
  }

  // Recommendations
  summary += `## Recommendations\n\n`;

  // Based on completed work
  if (activity.completedCards.length === 0) {
    summary += `- Consider investigating why no cards were completed during this period.\n`;
  } else if (activity.completedCards.length < 3 && period.type !== "year") {
    summary += `- The completion rate appears to be lower than optimal. Consider reviewing the workflow for potential bottlenecks.\n`;
  }

  // Based on card flow
  if (mostActiveList) {
    const mostActiveListName = mostActiveList.name.toLowerCase();
    if (mostActiveListName.includes("backlog") || mostActiveListName.includes("todo")) {
      summary += `- There's significant activity in the "${mostActiveList.name}" list. Consider prioritizing these items to move them forward in the workflow.\n`;
    } else if (mostActiveListName.includes("progress") || mostActiveListName.includes("doing")) {
      summary += `- Many cards are in "${mostActiveList.name}". Consider whether the team might be taking on too much work simultaneously.\n`;
    } else if (mostActiveListName.includes("review") || mostActiveListName.includes("validation")) {
      summary += `- The "${mostActiveList.name}" list appears to be a potential bottleneck. Consider allocating more resources to review and validation.\n`;
    }
  }

  return summary;
}
