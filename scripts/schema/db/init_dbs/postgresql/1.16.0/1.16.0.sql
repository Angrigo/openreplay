\set previous_version 'v1.15.0'
\set next_version 'v1.16.0'
SELECT openreplay_version()                       AS current_version,
       openreplay_version() = :'previous_version' AS valid_previous,
       openreplay_version() = :'next_version'     AS is_next
\gset

\if :valid_previous
\echo valid previous DB version :'previous_version', starting DB upgrade to :'next_version'
BEGIN;
SELECT format($fn_def$
CREATE OR REPLACE FUNCTION openreplay_version()
    RETURNS text AS
$$
SELECT '%1$s'
$$ LANGUAGE sql IMMUTABLE;
$fn_def$, :'next_version')
\gexec

--

DO
$$
    BEGIN
        IF NOT EXISTS(SELECT *
                      FROM pg_type typ
                               INNER JOIN pg_namespace nsp
                                          ON nsp.oid = typ.typnamespace
                      WHERE nsp.nspname = current_schema()
                        AND typ.typname = 'ui_tests_status') THEN
            CREATE TYPE ui_tests_status AS ENUM ('preview', 'in-progress', 'paused', 'closed');
        END IF;
    END;
$$
LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.ut_tests
(
    test_id            integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
    project_id         integer                     NOT NULL REFERENCES public.projects (project_id) ON DELETE CASCADE,
    title              VARCHAR(255)                NOT NULL,
    starting_path      VARCHAR(255)                NULL,
    status             ui_tests_status             NOT NULL,
    require_mic        BOOLEAN                              DEFAULT FALSE,
    require_camera     BOOLEAN                              DEFAULT FALSE,
    description        TEXT                        NULL,
    guidelines         TEXT                        NULL,
    conclusion_message TEXT                        NULL,
    created_by         integer                     REFERENCES public.users (user_id) ON DELETE SET NULL,
    updated_by         integer                     REFERENCES public.users (user_id) ON DELETE SET NULL,
    visibility         BOOLEAN                              DEFAULT FALSE,
    created_at         timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at         timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at         timestamp without time zone NULL     DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS public.ut_tests_tasks
(
    task_id      integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
    test_id      integer      NOT NULL REFERENCES ut_tests (test_id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT         NULL,
    allow_typing BOOLEAN DEFAULT FALSE
);

DO
$$
    BEGIN
        IF NOT EXISTS(SELECT *
                      FROM pg_type typ
                               INNER JOIN pg_namespace nsp
                                          ON nsp.oid = typ.typnamespace
                      WHERE nsp.nspname = current_schema()
                        AND typ.typname = 'ut_signal_status') THEN
            CREATE TYPE ut_signal_status AS ENUM ('begin', 'done', 'skipped');
        END IF;
    END;
$$
LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.ut_tests_signals
(
    signal_id  integer generated BY DEFAULT AS IDENTITY PRIMARY KEY,
    session_id BIGINT           NULL REFERENCES public.sessions (session_id) ON DELETE SET NULL,
    test_id    integer          NOT NULL REFERENCES public.ut_tests (test_id) ON DELETE CASCADE,
    task_id    integer          NULL REFERENCES public.ut_tests_tasks (task_id) ON DELETE CASCADE,
    status     ut_signal_status NOT NULL,
    comment    TEXT             NULL,
    timestamp  BIGINT           NOT NULL,
    duration   BIGINT           NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ut_tests_signals_unique_session_id_test_id_task_id_ts_idx ON public.ut_tests_signals (session_id, test_id, task_id, timestamp);
CREATE INDEX IF NOT EXISTS ut_tests_signals_session_id_idx ON public.ut_tests_signals (session_id);

CREATE TABLE IF NOT EXISTS events.canvas_recordings
(
    session_id   bigint NOT NULL REFERENCES public.sessions (session_id) ON DELETE CASCADE,
    recording_id text   NOT NULL,
    timestamp    bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS canvas_recordings_session_id_idx ON events.canvas_recordings (session_id);

DROP SCHEMA IF EXISTS backup_v1_10_0 CASCADE;

UPDATE metrics
SET default_config='{
  "col": 4,
  "row": 2,
  "position": 0
}'::jsonb
WHERE metric_type = 'pathAnalysis';

COMMIT;

\elif :is_next
\echo new version detected :'next_version', nothing to do
\else
\warn skipping DB upgrade of :'next_version', expected previous version :'previous_version', found :'current_version'
\endif
