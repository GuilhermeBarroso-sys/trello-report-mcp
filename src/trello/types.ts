/**
 * TypeScript interfaces for Trello API objects
 */

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  url: string;
  shortUrl: string;
  closed: boolean;
  dateLastActivity: string;
  idOrganization?: string;
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  idBoard: string;
  pos: number;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  idBoard: string;
  idList: string;
  pos: number;
  dateLastActivity: string;
  due?: string;
  dueComplete?: boolean;
  idMembers: string[];
  idLabels: string[];
  shortUrl: string;
  url: string;
}

export interface TrelloLabel {
  id: string;
  idBoard: string;
  name: string;
  color: string;
}

export interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
}

export interface TrelloAction {
  id: string;
  idMemberCreator: string;
  type: string;
  date: string;
  data: {
    board?: {
      id: string;
      name: string;
    };
    list?: {
      id: string;
      name: string;
    };
    card?: {
      id: string;
      name: string;
    };
    listBefore?: {
      id: string;
      name: string;
    };
    listAfter?: {
      id: string;
      name: string;
    };
    text?: string;
  };
  memberCreator: {
    id: string;
    fullName: string;
    username: string;
  };
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ReportPeriod {
  type: "Q1" | "Q2" | "Q3" | "Q4" | "year";
  year: number;
}

export interface BoardActivity {
  cardsCreated: number;
  cardsCompleted: number;
  cardsMoved: number;
  commentsAdded: number;
  membersActive: Map<string, number>;
  listActivity: Map<string, number>;
  cardFlow: Map<string, Map<string, number>>;
}

export interface ReportOptions {
  boardId?: string;
  boardName?: string;
  period: ReportPeriod;
}

export interface ReportResult {
  boardInfo: TrelloBoard;
  period: ReportPeriod;
  dateRange: DateRange;
  lists: TrelloList[];
  cards: TrelloCard[];
  members: TrelloMember[];
  labels: TrelloLabel[];
  actions: TrelloAction[];
  activity: BoardActivity;
  markdown: string;
}
