-- CreateEnum
CREATE TYPE "discrepancy_severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "discrepancies" ADD COLUMN     "severity" "discrepancy_severity" NOT NULL DEFAULT 'MEDIUM';
