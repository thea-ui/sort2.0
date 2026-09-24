-- Migrate class strings stored in data (campus news badges, urgency badges) from
-- the pre-token brand hexes to the runtime CSS variables. Tailwind only emits
-- classes it can find in source, and the hex literals were replaced by var()
-- tokens in the client, so un-migrated rows would render unstyled.
UPDATE "campus_news" SET
  "tag_color" = regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace("tag_color", '#00271D', 'var(--primary)', 'gi'), '#00A77C', 'var(--accent)', 'gi'), '#008F6A', 'var(--accent-dark)', 'gi'), '#C69B26', 'var(--gold)', 'gi'), '#F9F3F0', 'var(--background)', 'gi'),
  "icon_color" = regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace("icon_color", '#00271D', 'var(--primary)', 'gi'), '#00A77C', 'var(--accent)', 'gi'), '#008F6A', 'var(--accent-dark)', 'gi'), '#C69B26', 'var(--gold)', 'gi'), '#F9F3F0', 'var(--background)', 'gi');

UPDATE "urgency_levels" SET
  "badge_style" = regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace("badge_style", '#00271D', 'var(--primary)', 'gi'), '#00A77C', 'var(--accent)', 'gi'), '#008F6A', 'var(--accent-dark)', 'gi'), '#C69B26', 'var(--gold)', 'gi'), '#F9F3F0', 'var(--background)', 'gi');

UPDATE "asset_conditions" SET
  "badge_style" = regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace("badge_style", '#00271D', 'var(--primary)', 'gi'), '#00A77C', 'var(--accent)', 'gi'), '#008F6A', 'var(--accent-dark)', 'gi'), '#C69B26', 'var(--gold)', 'gi'), '#F9F3F0', 'var(--background)', 'gi');
