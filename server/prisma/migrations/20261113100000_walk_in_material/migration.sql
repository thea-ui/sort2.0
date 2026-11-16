-- Walk-in material category (plastic bottles, aluminum cans, paper & cardboard).

ALTER TABLE "walk_in_turnovers" ADD COLUMN "material" TEXT NOT NULL DEFAULT 'pet_plastic';
