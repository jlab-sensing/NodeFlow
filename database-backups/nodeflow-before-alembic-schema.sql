--
-- PostgreSQL database dump
--

\restrict 7cL5TfpMrKOxzB5Z0kCtLj2ZeC4gFZfOQexb313sNAM3L9l01dntFjKat90vSg6

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activation_prefs; Type: TABLE; Schema: public; Owner: nodeflow
--

CREATE TABLE public.activation_prefs (
    id integer NOT NULL,
    uuid uuid NOT NULL,
    user_id uuid NOT NULL,
    group_id uuid NOT NULL,
    sensor_id integer NOT NULL,
    measurement character varying NOT NULL,
    condition_operator character varying NOT NULL,
    condition_value double precision NOT NULL,
    close_condition_operator character varying,
    close_condition_value double precision,
    enabled boolean NOT NULL
);


ALTER TABLE public.activation_prefs OWNER TO nodeflow;

--
-- Name: activation_prefs_id_seq; Type: SEQUENCE; Schema: public; Owner: nodeflow
--

CREATE SEQUENCE public.activation_prefs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activation_prefs_id_seq OWNER TO nodeflow;

--
-- Name: activation_prefs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nodeflow
--

ALTER SEQUENCE public.activation_prefs_id_seq OWNED BY public.activation_prefs.id;


--
-- Name: groups; Type: TABLE; Schema: public; Owner: nodeflow
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    uuid uuid NOT NULL,
    name character varying NOT NULL,
    user_id uuid NOT NULL,
    date_created timestamp without time zone NOT NULL,
    irrigation_mode character varying DEFAULT 'auto'::character varying NOT NULL,
    CONSTRAINT valid_irrigation_mode CHECK (((irrigation_mode)::text = ANY ((ARRAY['manual'::character varying, 'auto'::character varying])::text[])))
);


ALTER TABLE public.groups OWNER TO nodeflow;

--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: nodeflow
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.groups_id_seq OWNER TO nodeflow;

--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nodeflow
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: logger; Type: TABLE; Schema: public; Owner: nodeflow
--

CREATE TABLE public.logger (
    id integer NOT NULL,
    uuid uuid NOT NULL,
    user_id uuid NOT NULL,
    logger_id integer NOT NULL,
    last_seen timestamp without time zone NOT NULL,
    update_interval integer NOT NULL
);


ALTER TABLE public.logger OWNER TO nodeflow;

--
-- Name: logger_id_seq; Type: SEQUENCE; Schema: public; Owner: nodeflow
--

CREATE SEQUENCE public.logger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.logger_id_seq OWNER TO nodeflow;

--
-- Name: logger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nodeflow
--

ALTER SEQUENCE public.logger_id_seq OWNED BY public.logger.id;


--
-- Name: notification_prefs; Type: TABLE; Schema: public; Owner: nodeflow
--

CREATE TABLE public.notification_prefs (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    tag_id integer NOT NULL,
    condition character varying NOT NULL,
    notification_frequency_seconds double precision NOT NULL,
    enabled boolean NOT NULL
);


ALTER TABLE public.notification_prefs OWNER TO nodeflow;

--
-- Name: notification_prefs_id_seq; Type: SEQUENCE; Schema: public; Owner: nodeflow
--

CREATE SEQUENCE public.notification_prefs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_prefs_id_seq OWNER TO nodeflow;

--
-- Name: notification_prefs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nodeflow
--

ALTER SEQUENCE public.notification_prefs_id_seq OWNED BY public.notification_prefs.id;


--
-- Name: oauth_tokens; Type: TABLE; Schema: public; Owner: nodeflow
--

CREATE TABLE public.oauth_tokens (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    access_token character varying NOT NULL,
    refresh_token character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.oauth_tokens OWNER TO nodeflow;

--
-- Name: oauth_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: nodeflow
--

CREATE SEQUENCE public.oauth_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.oauth_tokens_id_seq OWNER TO nodeflow;

--
-- Name: oauth_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nodeflow
--

ALTER SEQUENCE public.oauth_tokens_id_seq OWNED BY public.oauth_tokens.id;


--
-- Name: sensor; Type: TABLE; Schema: public; Owner: nodeflow
--

CREATE TABLE public.sensor (
    id integer NOT NULL,
    uuid uuid NOT NULL,
    user_id uuid NOT NULL,
    sensor_type character varying NOT NULL,
    sensor_id integer NOT NULL,
    logger_id integer NOT NULL,
    group_id uuid,
    name character varying NOT NULL,
    legacy_cell_id integer
);


ALTER TABLE public.sensor OWNER TO nodeflow;

--
-- Name: sensor_id_seq; Type: SEQUENCE; Schema: public; Owner: nodeflow
--

CREATE SEQUENCE public.sensor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sensor_id_seq OWNER TO nodeflow;

--
-- Name: sensor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nodeflow
--

ALTER SEQUENCE public.sensor_id_seq OWNED BY public.sensor.id;


--
-- Name: sensor_readings; Type: TABLE; Schema: public; Owner: nodeflow
--

CREATE TABLE public.sensor_readings (
    id integer NOT NULL,
    sensor_uuid uuid NOT NULL,
    user_id uuid NOT NULL,
    measurement character varying NOT NULL,
    value double precision NOT NULL,
    unit character varying,
    "timestamp" timestamp with time zone NOT NULL
);


ALTER TABLE public.sensor_readings OWNER TO nodeflow;

--
-- Name: sensor_readings_id_seq; Type: SEQUENCE; Schema: public; Owner: nodeflow
--

CREATE SEQUENCE public.sensor_readings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sensor_readings_id_seq OWNER TO nodeflow;

--
-- Name: sensor_readings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nodeflow
--

ALTER SEQUENCE public.sensor_readings_id_seq OWNED BY public.sensor_readings.id;


--
-- Name: solenoid; Type: TABLE; Schema: public; Owner: nodeflow
--

CREATE TABLE public.solenoid (
    id integer NOT NULL,
    uuid uuid NOT NULL,
    user_id uuid NOT NULL,
    name character varying NOT NULL,
    active_state character varying NOT NULL,
    logger_id integer NOT NULL,
    group_id uuid,
    date_created timestamp without time zone NOT NULL
);


ALTER TABLE public.solenoid OWNER TO nodeflow;

--
-- Name: solenoid_id_seq; Type: SEQUENCE; Schema: public; Owner: nodeflow
--

CREATE SEQUENCE public.solenoid_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.solenoid_id_seq OWNER TO nodeflow;

--
-- Name: solenoid_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nodeflow
--

ALTER SEQUENCE public.solenoid_id_seq OWNED BY public.solenoid.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: nodeflow
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    password character varying NOT NULL,
    date_created timestamp without time zone NOT NULL,
    api_key character varying
);


ALTER TABLE public.users OWNER TO nodeflow;

--
-- Name: activation_prefs id; Type: DEFAULT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.activation_prefs ALTER COLUMN id SET DEFAULT nextval('public.activation_prefs_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: logger id; Type: DEFAULT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.logger ALTER COLUMN id SET DEFAULT nextval('public.logger_id_seq'::regclass);


--
-- Name: notification_prefs id; Type: DEFAULT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.notification_prefs ALTER COLUMN id SET DEFAULT nextval('public.notification_prefs_id_seq'::regclass);


--
-- Name: oauth_tokens id; Type: DEFAULT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.oauth_tokens ALTER COLUMN id SET DEFAULT nextval('public.oauth_tokens_id_seq'::regclass);


--
-- Name: sensor id; Type: DEFAULT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.sensor ALTER COLUMN id SET DEFAULT nextval('public.sensor_id_seq'::regclass);


--
-- Name: sensor_readings id; Type: DEFAULT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.sensor_readings ALTER COLUMN id SET DEFAULT nextval('public.sensor_readings_id_seq'::regclass);


--
-- Name: solenoid id; Type: DEFAULT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.solenoid ALTER COLUMN id SET DEFAULT nextval('public.solenoid_id_seq'::regclass);


--
-- Name: activation_prefs activation_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.activation_prefs
    ADD CONSTRAINT activation_prefs_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: logger logger_pkey; Type: CONSTRAINT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.logger
    ADD CONSTRAINT logger_pkey PRIMARY KEY (id);


--
-- Name: notification_prefs notification_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.notification_prefs
    ADD CONSTRAINT notification_prefs_pkey PRIMARY KEY (id);


--
-- Name: oauth_tokens oauth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.oauth_tokens
    ADD CONSTRAINT oauth_tokens_pkey PRIMARY KEY (id);


--
-- Name: sensor sensor_pkey; Type: CONSTRAINT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.sensor
    ADD CONSTRAINT sensor_pkey PRIMARY KEY (id);


--
-- Name: sensor_readings sensor_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.sensor_readings
    ADD CONSTRAINT sensor_readings_pkey PRIMARY KEY (id);


--
-- Name: solenoid solenoid_pkey; Type: CONSTRAINT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.solenoid
    ADD CONSTRAINT solenoid_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_activation_prefs_group_id; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_activation_prefs_group_id ON public.activation_prefs USING btree (group_id);


--
-- Name: ix_activation_prefs_user_id; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_activation_prefs_user_id ON public.activation_prefs USING btree (user_id);


--
-- Name: ix_activation_prefs_uuid; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_activation_prefs_uuid ON public.activation_prefs USING btree (uuid);


--
-- Name: ix_groups_uuid; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_groups_uuid ON public.groups USING btree (uuid);


--
-- Name: ix_logger_user_id; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_logger_user_id ON public.logger USING btree (user_id);


--
-- Name: ix_logger_uuid; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_logger_uuid ON public.logger USING btree (uuid);


--
-- Name: ix_notification_prefs_user_id; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_notification_prefs_user_id ON public.notification_prefs USING btree (user_id);


--
-- Name: ix_oauth_tokens_refresh_token; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_oauth_tokens_refresh_token ON public.oauth_tokens USING btree (refresh_token);


--
-- Name: ix_oauth_tokens_user_id; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_oauth_tokens_user_id ON public.oauth_tokens USING btree (user_id);


--
-- Name: ix_sensor_legacy_cell_id; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_sensor_legacy_cell_id ON public.sensor USING btree (legacy_cell_id);


--
-- Name: ix_sensor_readings_measurement; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_sensor_readings_measurement ON public.sensor_readings USING btree (measurement);


--
-- Name: ix_sensor_readings_sensor_uuid; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_sensor_readings_sensor_uuid ON public.sensor_readings USING btree (sensor_uuid);


--
-- Name: ix_sensor_readings_timestamp; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_sensor_readings_timestamp ON public.sensor_readings USING btree ("timestamp");


--
-- Name: ix_sensor_readings_user_id; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_sensor_readings_user_id ON public.sensor_readings USING btree (user_id);


--
-- Name: ix_sensor_user_id; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_sensor_user_id ON public.sensor USING btree (user_id);


--
-- Name: ix_sensor_uuid; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_sensor_uuid ON public.sensor USING btree (uuid);


--
-- Name: ix_solenoid_user_id; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_solenoid_user_id ON public.solenoid USING btree (user_id);


--
-- Name: ix_solenoid_uuid; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_solenoid_uuid ON public.solenoid USING btree (uuid);


--
-- Name: ix_users_api_key; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE INDEX ix_users_api_key ON public.users USING btree (api_key);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: nodeflow
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: oauth_tokens oauth_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nodeflow
--

ALTER TABLE ONLY public.oauth_tokens
    ADD CONSTRAINT oauth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 7cL5TfpMrKOxzB5Z0kCtLj2ZeC4gFZfOQexb313sNAM3L9l01dntFjKat90vSg6

