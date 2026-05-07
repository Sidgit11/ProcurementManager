ALTER TABLE "fx_rate_snapshot" ALTER COLUMN "rate_micros" SET DATA TYPE bigint USING "rate_micros"::bigint;
