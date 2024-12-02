-- CreateEnum
CREATE TYPE "WorkspaceMemberStatus" AS ENUM ('Pending', 'NeedMoreSeat', 'UnderReview', 'Accepted');

-- AlterTable
ALTER TABLE "workspace_user_permissions" ADD COLUMN     "status" "WorkspaceMemberStatus" NOT NULL DEFAULT 'Pending',
ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "workspace_features" ADD COLUMN     "configs" JSON NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "workspace_features_workspace_id_idx" ON "workspace_features"("workspace_id");
