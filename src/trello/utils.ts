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
