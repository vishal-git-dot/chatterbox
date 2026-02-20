export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: number;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  read: boolean;
  readAt?: number;
  reactions?: Reaction[];
  encrypted?: boolean;
  editedAt?: number;
  deleted?: boolean;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: Message;
  updatedAt: number;
}

export interface ContactRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: number;
}

export interface BlockedUser {
  id: string;
  blockedUserId: string;
  blockedBy: string;
  timestamp: number;
}
