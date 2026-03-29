-- AlterTable: add emoji to Group (with default)
ALTER TABLE "Group" ADD COLUMN "emoji" TEXT NOT NULL DEFAULT '💰';
