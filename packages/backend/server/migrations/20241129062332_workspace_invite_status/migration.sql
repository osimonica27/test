/*
  Warnings:

  - Added the required column `updated_at` to the `workspace_user_permissions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkspaceMemberStatus" AS ENUM ('Pending', 'NeedMoreSeat', 'UnderReview', 'Accepted');

-- AlterTable
ALTER TABLE "workspace_user_permissions" ADD COLUMN     "status" "WorkspaceMemberStatus" NOT NULL DEFAULT 'Pending',
ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL;
