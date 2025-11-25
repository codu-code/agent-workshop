// MongoDB initialization script for GitNation AI Chatbot

// Switch to the gitnation database
db = db.getSiblingDB("gitnation");

// Create collections with validation schemas
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "createdAt"],
      properties: {
        email: {
          bsonType: "string",
          description: "User email - required",
        },
        password: {
          bsonType: ["string", "null"],
          description: "Hashed password - nullable for guest users",
        },
        type: {
          bsonType: "string",
          enum: ["guest", "user"],
          description: "User type",
        },
        createdAt: {
          bsonType: "date",
          description: "Creation timestamp - required",
        },
      },
    },
  },
});

db.createCollection("chats", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "createdAt"],
      properties: {
        title: {
          bsonType: "string",
          description: "Chat title",
        },
        userId: {
          bsonType: "string",
          description: "User ID reference - required",
        },
        visibility: {
          bsonType: "string",
          enum: ["private", "public"],
          description: "Chat visibility",
        },
        lastContext: {
          bsonType: "object",
          description: "Usage statistics and context",
        },
        createdAt: {
          bsonType: "date",
          description: "Creation timestamp - required",
        },
      },
    },
  },
});

db.createCollection("messages", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["chatId", "role", "parts", "createdAt"],
      properties: {
        chatId: {
          bsonType: "string",
          description: "Chat ID reference - required",
        },
        role: {
          bsonType: "string",
          enum: ["user", "assistant", "system"],
          description: "Message role - required",
        },
        parts: {
          bsonType: "array",
          description:
            "Message parts (text, tool-call, tool-result, image, file) - required",
        },
        attachments: {
          bsonType: "array",
          description: "File attachments",
        },
        createdAt: {
          bsonType: "date",
          description: "Creation timestamp - required",
        },
      },
    },
  },
});

db.createCollection("documents", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "title", "content", "kind", "userId", "createdAt"],
      properties: {
        id: {
          bsonType: "string",
          description: "Document ID - required",
        },
        title: {
          bsonType: "string",
          description: "Document title - required",
        },
        content: {
          bsonType: "string",
          description: "Document content - required",
        },
        kind: {
          bsonType: "string",
          enum: ["text", "code", "sheet", "flashcard", "study-plan"],
          description: "Document kind - required",
        },
        userId: {
          bsonType: "string",
          description: "User ID reference - required",
        },
        embedding: {
          bsonType: "array",
          description: "Vector embedding for semantic search",
        },
        createdAt: {
          bsonType: "date",
          description: "Creation timestamp - required (used for versioning)",
        },
      },
    },
  },
});

db.createCollection("suggestions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "documentId",
        "documentCreatedAt",
        "originalText",
        "suggestedText",
        "userId",
      ],
      properties: {
        documentId: {
          bsonType: "string",
          description: "Document ID reference - required",
        },
        documentCreatedAt: {
          bsonType: "date",
          description: "Document version timestamp - required",
        },
        originalText: {
          bsonType: "string",
          description: "Original text - required",
        },
        suggestedText: {
          bsonType: "string",
          description: "Suggested text - required",
        },
        description: {
          bsonType: "string",
          description: "Suggestion description",
        },
        isResolved: {
          bsonType: "bool",
          description: "Whether suggestion is resolved",
        },
        userId: {
          bsonType: "string",
          description: "User ID reference - required",
        },
        createdAt: {
          bsonType: "date",
          description: "Creation timestamp",
        },
      },
    },
  },
});

db.createCollection("votes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["messageId", "chatId", "isUpvoted"],
      properties: {
        messageId: {
          bsonType: "string",
          description: "Message ID reference - required",
        },
        chatId: {
          bsonType: "string",
          description: "Chat ID reference - required",
        },
        isUpvoted: {
          bsonType: "bool",
          description: "Upvote/downvote - required",
        },
      },
    },
  },
});

// Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.chats.createIndex({ userId: 1, createdAt: -1 });
db.messages.createIndex({ chatId: 1, createdAt: 1 });
db.documents.createIndex({ id: 1, createdAt: -1 });
db.documents.createIndex({ userId: 1 });
db.suggestions.createIndex({ documentId: 1, documentCreatedAt: 1 });
db.votes.createIndex({ messageId: 1 }, { unique: true });

// Create vector search index for documents (if using Atlas or MongoDB 7.0+)
// Note: This requires Atlas Vector Search or MongoDB 7.0+
// Uncomment if you have the proper MongoDB version/setup
/*
db.documents.createSearchIndex(
  "document_embeddings_index",
  "vectorSearch",
  {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: 1536, // Adjust based on your embedding model
        similarity: "cosine"
      }
    ]
  }
);
*/

print("GitNation database initialized successfully!");
print(
  "Collections created: users, chats, messages, documents, suggestions, votes"
);
print("Indexes created for optimal query performance");
