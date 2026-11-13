-- Portal Meta News development baseline.
-- The postgres image creates the database configured by POSTGRES_DB before
-- running this file. Schema changes belong in TypeORM migrations, including
-- the extensions the application needs (unaccent, pg_trgm).

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
