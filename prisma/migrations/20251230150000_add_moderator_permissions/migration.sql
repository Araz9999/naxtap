-- Add moderator permissions array to User
ALTER TABLE "User"
ADD COLUMN "moderatorPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

