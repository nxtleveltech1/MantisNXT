-- Migration: 0258_add_system_metric_partitions.sql
-- Description: Add missing system_metric partitions for 2025 Q4 through 2026 Q2
-- up

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'system_metric_2025_q4') THEN
        CREATE TABLE system_metric_2025_q4 PARTITION OF system_metric
            FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'system_metric_2026_q1') THEN
        CREATE TABLE system_metric_2026_q1 PARTITION OF system_metric
            FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'system_metric_2026_q2') THEN
        CREATE TABLE system_metric_2026_q2 PARTITION OF system_metric
            FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
    END IF;
END$$;

-- down
DROP TABLE IF EXISTS system_metric_2026_q2;
DROP TABLE IF EXISTS system_metric_2026_q1;
DROP TABLE IF EXISTS system_metric_2025_q4;
