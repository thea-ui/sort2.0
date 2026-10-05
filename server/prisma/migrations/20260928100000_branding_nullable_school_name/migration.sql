-- Unconfigured tenant branding is represented as NULL, never a placeholder.
-- The client ThemeProvider renders the SORT default identity for NULL.
ALTER TABLE "system_settings" ALTER COLUMN "school_name" DROP NOT NULL;
ALTER TABLE "system_settings" ALTER COLUMN "school_name" DROP DEFAULT;
