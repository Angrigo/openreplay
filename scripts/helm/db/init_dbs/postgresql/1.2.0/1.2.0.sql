BEGIN;
CREATE INDEX pages_first_contentful_paint_time_idx ON events.pages (first_contentful_paint_time) WHERE first_contentful_paint_time > 0;
CREATE INDEX pages_dom_content_loaded_time_idx ON events.pages (dom_content_loaded_time) WHERE dom_content_loaded_time > 0;
CREATE INDEX pages_first_paint_time_idx ON events.pages (first_paint_time) WHERE first_paint_time > 0;
CREATE INDEX pages_ttfb_idx ON events.pages (ttfb) WHERE ttfb > 0;
CREATE INDEX pages_time_to_interactive_idx ON events.pages (time_to_interactive) WHERE time_to_interactive > 0;
CREATE INDEX sessions_session_id_project_id_start_ts_idx ON sessions (session_id, project_id, start_ts) WHERE duration > 0;
CREATE INDEX pages_session_id_timestamp_loadgt0NN_idx ON events.pages (session_id, timestamp) WHERE load_time > 0 AND load_time IS NOT NULL;
DROP INDEX events.resources_type_idx;
CREATE INDEX resources_timestamp_type_durationgt0NN_idx ON events.resources (timestamp, type) WHERE duration > 0 AND duration IS NOT NULL;
CREATE INDEX pages_session_id_timestamp_visualgt0nn_idx ON events.pages (session_id, timestamp) WHERE visually_complete > 0 AND visually_complete IS NOT NULL;
CREATE INDEX pages_timestamp_metgt0_idx ON events.pages (timestamp) WHERE response_time > 0 OR first_paint_time > 0 OR
                                                                          dom_content_loaded_time > 0 OR ttfb > 0 OR
                                                                          time_to_interactive > 0;
CREATE INDEX resources_session_id_timestamp_idx ON events.resources (session_id, timestamp);
DROP INDEX events.resources_timestamp_idx;
CREATE INDEX resources_session_id_timestamp_type_idx ON events.resources (session_id, timestamp, type);
CREATE INDEX pages_session_id_speed_indexgt0nn_idx ON events.pages (session_id, speed_index) WHERE speed_index > 0 AND speed_index IS NOT NULL;
CREATE INDEX pages_session_id_timestamp_dom_building_timegt0nn_idx ON events.pages (session_id, timestamp, dom_building_time) WHERE dom_building_time > 0 AND dom_building_time IS NOT NULL;
CREATE INDEX resources_timestamp_type_durationgt0NN_noFetch_idx ON events.resources (timestamp, type) WHERE duration > 0 AND duration IS NOT NULL AND type != 'fetch';
CREATE INDEX resources_session_id_timestamp_url_host_fail_idx ON events.resources (session_id, timestamp, url_host) WHERE success = FALSE;
DROP INDEX events.resources_success_idx;
CREATE INDEX resources_session_id_timestamp_url_host_firstparty_idx ON events.resources (session_id, timestamp, url_host) WHERE type IN ('fetch', 'script');
DROP INDEX events.errors_timestamp_idx;
CREATE INDEX errors_session_id_timestamp_error_id_idx ON events.errors (session_id, timestamp, error_id);
CREATE INDEX errors_project_id_error_id_js_exception_idx ON public.errors (project_id, error_id) WHERE source = 'js_exception';
CREATE INDEX errors_error_id_timestamp_idx ON events.errors (error_id, timestamp);
CREATE INDEX errors_project_id_error_id_idx ON public.errors (project_id, error_id);
CREATE INDEX errors_timestamp_error_id_session_id_idx ON events.errors (timestamp, error_id, session_id);
CREATE INDEX resources_session_id_timestamp_duration_durationgt0NN_img_idx ON events.resources (session_id, timestamp, duration) WHERE duration > 0 AND duration IS NOT NULL AND type = 'img';
CREATE INDEX resources_timestamp_session_id_idx ON events.resources (timestamp, session_id);
CREATE INDEX errors_project_id_error_id_integration_idx ON public.errors (project_id, error_id) WHERE source != 'js_exception';
CREATE INDEX errors_error_id_timestamp_session_id_idx ON events.errors (error_id, timestamp, session_id);
CREATE TYPE user_origin AS ENUM ('saml');
ALTER TABLE public.users
    ADD COLUMN origin      user_origin NULL DEFAULT NULL,
    ADD COLUMN internal_id text        NULL DEFAULT NULL;
COMMIT;