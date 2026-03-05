-- Step 1: Create PostRelatedPerson and migrate data from Post.relatedPersonId
CREATE TABLE "PostRelatedPerson" (
    "postId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    CONSTRAINT "PostRelatedPerson_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostRelatedPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("postId", "personId")
);

CREATE INDEX "PostRelatedPerson_postId_idx" ON "PostRelatedPerson"("postId");
CREATE INDEX "PostRelatedPerson_personId_idx" ON "PostRelatedPerson"("personId");

INSERT INTO "PostRelatedPerson" ("postId", "personId")
SELECT "id", "relatedPersonId" FROM "Post" WHERE "relatedPersonId" IS NOT NULL;

-- Step 2: Backup PostRelatedPerson (no FK so we can drop Post later)
CREATE TABLE "_PostRelatedPerson_backup" (
    "postId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    PRIMARY KEY ("postId", "personId")
);
INSERT INTO "_PostRelatedPerson_backup" SELECT "postId", "personId" FROM "PostRelatedPerson";

DROP TABLE "PostRelatedPerson";

-- Step 3: Recreate Post without relatedPersonId
CREATE TABLE "Post_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "Post_new" ("id", "type", "content", "authorId", "createdAt")
SELECT "id", "type", "content", "authorId", "createdAt" FROM "Post";

DROP TABLE "Post";
ALTER TABLE "Post_new" RENAME TO "Post";

CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- Step 4: Recreate PostRelatedPerson and restore data
CREATE TABLE "PostRelatedPerson" (
    "postId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    CONSTRAINT "PostRelatedPerson_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostRelatedPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("postId", "personId")
);

CREATE INDEX "PostRelatedPerson_postId_idx" ON "PostRelatedPerson"("postId");
CREATE INDEX "PostRelatedPerson_personId_idx" ON "PostRelatedPerson"("personId");

INSERT INTO "PostRelatedPerson" ("postId", "personId") SELECT "postId", "personId" FROM "_PostRelatedPerson_backup";
DROP TABLE "_PostRelatedPerson_backup";
