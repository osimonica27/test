-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "enable_ai" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enable_share" BOOLEAN NOT NULL DEFAULT true;
