/**
 * Trello API client for interacting with Trello boards, lists, cards, and actions
 */

import axios from "axios";
import {
  TrelloBoard,
  TrelloList,
  TrelloCard,
  TrelloMember,
  TrelloLabel,
  TrelloAction,
  DateRange,
} from "./types";

// Trello API base URL
const TRELLO_API_BASE_URL = "https://api.trello.com/1";

export class TrelloApiClient {
  private apiKey: string;
  private apiToken: string;

  constructor() {
    this.apiKey = process.env.TRELLO_API_KEY || "";
    this.apiToken = process.env.TRELLO_API_TOKEN || "";

    if (!this.apiKey || !this.apiToken) {
      throw new Error(
        "Trello API credentials not found. Please set TRELLO_API_KEY and TRELLO_API_TOKEN in your environment."
      );
    }
  }

  /**
   * Get authentication parameters for Trello API requests
   */
  private getAuthParams(): { key: string; token: string } {
    return {
      key: this.apiKey,
      token: this.apiToken,
    };
  }

  /**
   * Make a GET request to the Trello API
   */
  private async get<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      const response = await axios.get(`${TRELLO_API_BASE_URL}${endpoint}`, {
        params: {
          ...this.getAuthParams(),
          ...params,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Trello API error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all boards for the authenticated user
   */
  async getBoards(): Promise<TrelloBoard[]> {
    return this.get<TrelloBoard[]>("/members/me/boards");
  }

  /**
   * Find a board by name (case-insensitive partial match)
   */
  async findBoardByName(name: string): Promise<TrelloBoard | null> {
    const boards = await this.getBoards();
    const normalizedName = name.toLowerCase();

    return boards.find((board) => board.name.toLowerCase().includes(normalizedName)) || null;
  }

  /**
   * Get a board by ID
   */
  async getBoard(boardId: string): Promise<TrelloBoard> {
    return this.get<TrelloBoard>(`/boards/${boardId}`);
  }

  /**
   * Get all lists on a board
   */
  async getLists(boardId: string): Promise<TrelloList[]> {
    return this.get<TrelloList[]>(`/boards/${boardId}/lists`, {
      filter: "all",
    });
  }

  /**
   * Get all cards on a board
   */
  async getCards(boardId: string): Promise<TrelloCard[]> {
    return this.get<TrelloCard[]>(`/boards/${boardId}/cards`, {
      filter: "all",
    });
  }

  /**
   * Get all members of a board
   */
  async getMembers(boardId: string): Promise<TrelloMember[]> {
    return this.get<TrelloMember[]>(`/boards/${boardId}/members`);
  }

  /**
   * Get all labels on a board
   */
  async getLabels(boardId: string): Promise<TrelloLabel[]> {
    return this.get<TrelloLabel[]>(`/boards/${boardId}/labels`);
  }

  /**
   * Get actions for a board within a date range
   */
  async getActions(
    boardId: string,
    dateRange: DateRange,
    limit: number = 1000
  ): Promise<TrelloAction[]> {
    return this.get<TrelloAction[]>(`/boards/${boardId}/actions`, {
      limit,
      since: dateRange.start.toISOString(),
      before: dateRange.end.toISOString(),
      filter: "all",
    });
  }
}

// Export a singleton instance
export const trelloApi = new TrelloApiClient();
