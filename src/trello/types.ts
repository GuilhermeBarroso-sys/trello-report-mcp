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
  badges?: {
    attachments: number;
    checkItems: number;
    checkItemsChecked: number;
    comments: number;
    description: boolean;
    due?: string;
    dueComplete?: boolean;
  };
}

export interface TrelloComment {
  id: string;
  idMemberCreator: string;
  data: {
    text: string;
    card: {
      id: string;
      name: string;
    };
  };
  date: string;
  memberCreator: {
    id: string;
    fullName: string;
    username: string;
  };
}

export interface TrelloChecklist {
  id: string;
  name: string;
  idCard: string;
  checkItems: TrelloCheckItem[];
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  state: "complete" | "incomplete";
  idChecklist: string;
  pos: number;
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
  // Card-focused metrics
  cardsByLabel: Map<string, TrelloCard[]>;
  topCards: TrelloCard[];
  completedCards: TrelloCard[];
  inProgressCards: TrelloCard[];
  cardChecklists: Map<string, TrelloChecklist[]>;
}

export interface ReportOptions {
  boardId?: string;
  boardName?: string;
  period: ReportPeriod;
  format?: "summary" | "full"; // Default is "summary"
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
