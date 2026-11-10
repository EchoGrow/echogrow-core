-- CreateEnum
CREATE TYPE "interview_status" AS ENUM ('QUEUED', 'PROCESSING', 'SCORED', 'FLAGGED', 'NEEDS_REVIEW', 'COMPLETED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "scorecard_status" AS ENUM ('PENDING_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "dimension_type" AS ENUM ('TECHNICAL_DEPTH', 'COMMUNICATION', 'DOMAIN_EXPERIENCE', 'PROBLEM_SOLVING');

-- CreateEnum
CREATE TYPE "discrepancy_status" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "skill_gap_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_sessions" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "transcript_hash" VARCHAR(64) NOT NULL,
    "resume" TEXT NOT NULL,
    "resume_hash" VARCHAR(64) NOT NULL,
    "structured_transcript" JSONB,
    "status" "interview_status" NOT NULL DEFAULT 'QUEUED',
    "is_scored" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_planned" BOOLEAN NOT NULL DEFAULT false,
    "manual_review_minutes" DOUBLE PRECISION,
    "echogrow_seconds" INTEGER,
    "saved_minutes" DOUBLE PRECISION,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "spk_status" TEXT,
    "spk_error" TEXT,

    CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scorecards" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "overall_score" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "status" "scorecard_status" NOT NULL DEFAULT 'PENDING_REVIEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scorecards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dimensions" (
    "id" TEXT NOT NULL,
    "scorecard_id" TEXT NOT NULL,
    "dimension_type" "dimension_type" NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT,
    "evidence_quote" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discrepancies" (
    "id" TEXT NOT NULL,
    "scorecard_id" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "cv_quote" TEXT,
    "interview_quote" TEXT,
    "confidence" DOUBLE PRECISION,
    "status" "discrepancy_status" NOT NULL DEFAULT 'PENDING',
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discrepancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_gaps" (
    "id" TEXT NOT NULL,
    "dimension_id" TEXT NOT NULL,
    "skill_name" TEXT NOT NULL,
    "priority" "skill_gap_priority" NOT NULL DEFAULT 'MEDIUM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmaps" (
    "id" TEXT NOT NULL,
    "scorecard_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_items" (
    "id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "skill_gap_id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "resource_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spk_profiles" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "seniority" TEXT,
    "primary_role" TEXT,
    "timezone" TEXT,
    "languages" JSONB,
    "years_of_experience" INTEGER,
    "spk_payload" JSONB NOT NULL,
    "schema_version" TEXT NOT NULL DEFAULT '1.0.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spk_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- CreateIndex
CREATE INDEX "interview_sessions_candidate_id_idx" ON "interview_sessions"("candidate_id");

-- CreateIndex
CREATE INDEX "interview_sessions_transcript_hash_idx" ON "interview_sessions"("transcript_hash");

-- CreateIndex
CREATE INDEX "interview_sessions_resume_hash_idx" ON "interview_sessions"("resume_hash");

-- CreateIndex
CREATE UNIQUE INDEX "scorecards_interview_id_key" ON "scorecards"("interview_id");

-- CreateIndex
CREATE INDEX "dimensions_scorecard_id_idx" ON "dimensions"("scorecard_id");

-- CreateIndex
CREATE UNIQUE INDEX "dimensions_scorecard_id_dimension_type_key" ON "dimensions"("scorecard_id", "dimension_type");

-- CreateIndex
CREATE INDEX "discrepancies_scorecard_id_idx" ON "discrepancies"("scorecard_id");

-- CreateIndex
CREATE INDEX "skill_gaps_dimension_id_idx" ON "skill_gaps"("dimension_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_gaps_dimension_id_skill_name_key" ON "skill_gaps"("dimension_id", "skill_name");

-- CreateIndex
CREATE UNIQUE INDEX "roadmaps_scorecard_id_key" ON "roadmaps"("scorecard_id");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_items_skill_gap_id_key" ON "roadmap_items"("skill_gap_id");

-- CreateIndex
CREATE INDEX "roadmap_items_roadmap_id_idx" ON "roadmap_items"("roadmap_id");

-- CreateIndex
CREATE UNIQUE INDEX "spk_profiles_interview_id_key" ON "spk_profiles"("interview_id");

-- CreateIndex
CREATE INDEX "spk_profiles_interview_id_idx" ON "spk_profiles"("interview_id");

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interview_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dimensions" ADD CONSTRAINT "dimensions_scorecard_id_fkey" FOREIGN KEY ("scorecard_id") REFERENCES "scorecards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discrepancies" ADD CONSTRAINT "discrepancies_scorecard_id_fkey" FOREIGN KEY ("scorecard_id") REFERENCES "scorecards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_gaps" ADD CONSTRAINT "skill_gaps_dimension_id_fkey" FOREIGN KEY ("dimension_id") REFERENCES "dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_scorecard_id_fkey" FOREIGN KEY ("scorecard_id") REFERENCES "scorecards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_skill_gap_id_fkey" FOREIGN KEY ("skill_gap_id") REFERENCES "skill_gaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spk_profiles" ADD CONSTRAINT "spk_profiles_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
