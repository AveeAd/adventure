-- GuideProfile.currency (I18N.md's "Required additions" - a data-model
-- gap the i18n pass surfaced, not an i18n change itself). Same shape as
-- TripReport.currency: a fixed short list validated in the DTO, defaults
-- to NPR for backward compatibility with existing rows.
ALTER TABLE "guide_profiles" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'NPR';
