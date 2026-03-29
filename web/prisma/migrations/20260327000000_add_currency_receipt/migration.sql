-- AlterTable: add currency to Group
ALTER TABLE "Group" ADD COLUMN "currency" TEXT DEFAULT 'INR';

-- AlterTable: add receiptUrl to Expense
ALTER TABLE "Expense" ADD COLUMN "receiptUrl" TEXT;
