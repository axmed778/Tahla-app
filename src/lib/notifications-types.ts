export const NOTIFICATION_TYPES = {
  FRIEND_REQUEST: "FRIEND_REQUEST",
  NEW_MESSAGE: "NEW_MESSAGE",
  EVENT_INVITE: "EVENT_INVITE",
  GROUP_APPLICATION_APPROVED: "GROUP_APPLICATION_APPROVED",
  GROUP_APPLICATION_REJECTED: "GROUP_APPLICATION_REJECTED",
  GROUP_APPLICATION_RECEIVED: "GROUP_APPLICATION_RECEIVED",
  FEED_COMMENT: "FEED_COMMENT",
  ADDED_AS_RELATIVE: "ADDED_AS_RELATIVE",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type NotificationMeta = {
  eventId?: string;
  eventName?: string;
  groupId?: string;
  groupName?: string;
  conversationId?: string;
  postId?: string;
  personId?: string;
  friendRequestId?: string;
};

export type NotificationItem = {
  id: string;
  type: string;
  readAt: Date | null;
  createdAt: Date;
  actorName: string | null;
  meta: NotificationMeta | null;
};
