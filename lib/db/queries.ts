import "server-only";

import { ObjectId } from "mongodb";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import { generateUUID } from "../utils";
import { getCollection } from "./mongodb";
import type {
  Chat,
  DBMessage,
  Document,
  Stream,
  Suggestion,
  User,
  Vote,
} from "./types";
import { generateHashedPassword } from "./utils";

// User Functions

export async function getUser(email: string): Promise<User[]> {
  try {
    const users = await getCollection<User>("users");
    const user = await users.findOne({ email });
    return user ? [user] : [];
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    const users = await getCollection<User>("users");
    const id = generateUUID();
    await users.insertOne({
      _id: new ObjectId(),
      id,
      email,
      password: hashedPassword,
      type: "user",
      createdAt: new Date(),
    });
    return { id, email };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    const users = await getCollection<User>("users");
    const id = generateUUID();
    await users.insertOne({
      _id: new ObjectId(),
      id,
      email,
      password,
      type: "guest",
      createdAt: new Date(),
    });
    return [{ id, email }];
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

// Chat Functions

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    const chats = await getCollection<Chat>("chats");
    await chats.insertOne({
      _id: new ObjectId(),
      id,
      userId,
      title,
      visibility,
      createdAt: new Date(),
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    const votes = await getCollection<Vote>("votes");
    const messages = await getCollection<DBMessage>("messages");
    const streams = await getCollection<Stream>("streams");
    const chats = await getCollection<Chat>("chats");

    await votes.deleteMany({ chatId: id });
    await messages.deleteMany({ chatId: id });
    await streams.deleteMany({ chatId: id });

    const result = await chats.findOneAndDelete(
      { id },
      { includeResultMetadata: true }
    );
    return result.value;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const chats = await getCollection<Chat>("chats");
    const votes = await getCollection<Vote>("votes");
    const messages = await getCollection<DBMessage>("messages");
    const streams = await getCollection<Stream>("streams");

    const userChats = await chats.find({ userId }).toArray();

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await votes.deleteMany({ chatId: { $in: chatIds } });
    await messages.deleteMany({ chatId: { $in: chatIds } });
    await streams.deleteMany({ chatId: { $in: chatIds } });

    const result = await chats.deleteMany({ userId });

    return { deletedCount: result.deletedCount };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const chats = await getCollection<Chat>("chats");
    const extendedLimit = limit + 1;

    const query: any = { userId: id };

    if (startingAfter) {
      const selectedChat = await chats.findOne({ id: startingAfter });

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      query.createdAt = { $gt: selectedChat.createdAt };
    } else if (endingBefore) {
      const selectedChat = await chats.findOne({ id: endingBefore });

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      query.createdAt = { $lt: selectedChat.createdAt };
    }

    const filteredChats = await chats
      .find(query)
      .sort({ createdAt: -1 })
      .limit(extendedLimit)
      .toArray();

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const chats = await getCollection<Chat>("chats");
    const selectedChat = await chats.findOne({ id });
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    const chats = await getCollection<Chat>("chats");
    await chats.updateOne({ id: chatId }, { $set: { visibility } });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatLastContextById({
  chatId,
  context,
}: {
  chatId: string;
  // Store merged server-enriched usage object
  context: AppUsage;
}) {
  try {
    const chats = await getCollection<Chat>("chats");
    await chats.updateOne({ id: chatId }, { $set: { lastContext: context } });
  } catch (error) {
    console.warn("Failed to update lastContext for chat", chatId, error);
    return;
  }
}

// Message Functions

export async function saveMessages({
  messages,
}: {
  messages: Omit<DBMessage, "_id">[];
}) {
  try {
    const messagesCollection = await getCollection<DBMessage>("messages");
    const messagesToInsert = messages.map((msg) => ({
      ...msg,
      _id: new ObjectId(),
    }));
    await messagesCollection.insertMany(messagesToInsert);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const messages = await getCollection<DBMessage>("messages");
    return await messages.find({ chatId: id }).sort({ createdAt: 1 }).toArray();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const messages = await getCollection<DBMessage>("messages");
    const message = await messages.findOne({ id });
    return message ? [message] : [];
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messages = await getCollection<DBMessage>("messages");
    const votes = await getCollection<Vote>("votes");

    const messagesToDelete = await messages
      .find({ chatId, createdAt: { $gte: timestamp } })
      .toArray();

    const messageIds = messagesToDelete.map((msg) => msg.id);

    if (messageIds.length > 0) {
      await votes.deleteMany({ chatId, messageId: { $in: messageIds } });
      await messages.deleteMany({ chatId, id: { $in: messageIds } });
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const messages = await getCollection<DBMessage>("messages");
    const chats = await getCollection<Chat>("chats");

    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    // Get all chat IDs for this user
    const userChats = await chats.find({ userId: id }).toArray();
    const chatIds = userChats.map((chat) => chat.id);

    // Count messages in those chats
    const count = await messages.countDocuments({
      chatId: { $in: chatIds },
      createdAt: { $gte: twentyFourHoursAgo },
      role: "user",
    });

    return count;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

// Vote Functions

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const votes = await getCollection<Vote>("votes");
    const existingVote = await votes.findOne({ messageId });

    if (existingVote) {
      await votes.updateOne(
        { messageId, chatId },
        { $set: { isUpvoted: type === "up" } }
      );
    } else {
      await votes.insertOne({
        _id: new ObjectId(),
        chatId,
        messageId,
        isUpvoted: type === "up",
      });
    }
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    const votes = await getCollection<Vote>("votes");
    return await votes.find({ chatId: id }).toArray();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

// Document Functions

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    const documents = await getCollection<Document>("documents");
    const document = {
      _id: new ObjectId(),
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    };
    await documents.insertOne(document);
    return [document];
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await getCollection<Document>("documents");
    return await documents.find({ id }).sort({ createdAt: 1 }).toArray();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const documents = await getCollection<Document>("documents");
    const document = await documents
      .find({ id })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    return document[0] || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    const documents = await getCollection<Document>("documents");
    const suggestions = await getCollection<Suggestion>("suggestions");

    await suggestions.deleteMany({
      documentId: id,
      documentCreatedAt: { $gt: timestamp },
    });

    const result = await documents
      .find({ id, createdAt: { $gt: timestamp } })
      .toArray();
    await documents.deleteMany({ id, createdAt: { $gt: timestamp } });

    return result;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

// Suggestion Functions

export async function saveSuggestions({
  suggestions: suggestionList,
}: {
  suggestions: Suggestion[];
}) {
  try {
    const suggestions = await getCollection<Suggestion>("suggestions");
    const suggestionsToInsert = suggestionList.map((sug) => ({
      ...sug,
      _id: new ObjectId(),
    }));
    await suggestions.insertMany(suggestionsToInsert);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    const suggestions = await getCollection<Suggestion>("suggestions");
    return await suggestions.find({ documentId }).toArray();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

// Stream Functions

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    const streams = await getCollection<Stream>("streams");
    await streams.insertOne({
      _id: new ObjectId(),
      id: streamId,
      chatId,
      createdAt: new Date(),
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streams = await getCollection<Stream>("streams");
    const streamIds = await streams
      .find({ chatId })
      .sort({ createdAt: 1 })
      .toArray();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}
