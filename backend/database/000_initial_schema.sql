-- Fresh database setup only. Schema snapshot; contains no application records or credentials.
--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    action character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_sessions (
    token_hash bytea NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT auth_sessions_token_hash_check CHECK ((octet_length(token_hash) = 32))
);


--
-- Name: concern_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concern_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concern_id uuid NOT NULL,
    assigned_to uuid NOT NULL,
    assigned_by uuid NOT NULL,
    note text,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    CONSTRAINT assignment_dates_valid CHECK (((ended_at IS NULL) OR (ended_at >= assigned_at)))
);


--
-- Name: concern_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concern_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concern_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    original_name character varying(255) NOT NULL,
    storage_path text NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size_bytes bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT concern_attachments_file_size_bytes_check CHECK (((file_size_bytes > 0) AND (file_size_bytes <= 10485760)))
);


--
-- Name: concern_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concern_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: concern_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concern_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concern_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    visibility character varying(20) DEFAULT 'student_visible'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT concern_messages_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['student_visible'::character varying, 'internal'::character varying])::text[]))),
    CONSTRAINT message_not_blank CHECK ((length(TRIM(BOTH FROM message)) > 0))
);


--
-- Name: concern_reference_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.concern_reference_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: concern_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concern_referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concern_id uuid NOT NULL,
    referred_by uuid NOT NULL,
    referred_to uuid NOT NULL,
    reason text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT concern_referrals_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT referral_reason_not_blank CHECK ((length(TRIM(BOTH FROM reason)) > 0))
);


--
-- Name: concern_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concern_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concern_id uuid NOT NULL,
    old_status character varying(20),
    new_status character varying(20) NOT NULL,
    changed_by uuid NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT history_new_status_valid CHECK (((new_status)::text = ANY ((ARRAY['submitted'::character varying, 'under_review'::character varying, 'assigned'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT history_old_status_valid CHECK (((old_status IS NULL) OR ((old_status)::text = ANY ((ARRAY['submitted'::character varying, 'under_review'::character varying, 'assigned'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying, 'rejected'::character varying])::text[]))))
);


--
-- Name: concerns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concerns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_no character varying(40) DEFAULT ((('SS-'::text || to_char((CURRENT_DATE)::timestamp with time zone, 'YYYY'::text)) || '-'::text) || lpad((nextval('public.concern_reference_seq'::regclass))::text, 6, '0'::text)) NOT NULL,
    student_id uuid NOT NULL,
    category_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    status character varying(20) DEFAULT 'submitted'::character varying NOT NULL,
    is_anonymous boolean DEFAULT false NOT NULL,
    resolution_summary text,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT concern_description_not_blank CHECK ((length(TRIM(BOTH FROM description)) > 0)),
    CONSTRAINT concern_title_not_blank CHECK ((length(TRIM(BOTH FROM title)) > 0)),
    CONSTRAINT concerns_status_check CHECK (((status)::text = ANY ((ARRAY['submitted'::character varying, 'under_review'::character varying, 'assigned'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    is_published boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT faq_answer_not_blank CHECK ((length(TRIM(BOTH FROM answer)) > 0)),
    CONSTRAINT faq_question_not_blank CHECK ((length(TRIM(BOTH FROM question)) > 0))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    concern_id uuid,
    type character varying(50) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) DEFAULT 'student'::character varying NOT NULL,
    student_number character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    course character varying(4),
    year_level smallint,
    section character varying(30),
    CONSTRAINT users_course_check CHECK (((course)::text = ANY ((ARRAY['BSIT'::character varying, 'BSCS'::character varying])::text[]))),
    CONSTRAINT users_email_not_blank CHECK ((length(TRIM(BOTH FROM email)) > 3)),
    CONSTRAINT users_name_not_blank CHECK ((length(TRIM(BOTH FROM full_name)) > 0)),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['student'::character varying, 'personnel'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT users_year_level_check CHECK (((year_level >= 1) AND (year_level <= 4)))
);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (token_hash);


--
-- Name: concern_assignments concern_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_assignments
    ADD CONSTRAINT concern_assignments_pkey PRIMARY KEY (id);


--
-- Name: concern_attachments concern_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_attachments
    ADD CONSTRAINT concern_attachments_pkey PRIMARY KEY (id);


--
-- Name: concern_categories concern_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_categories
    ADD CONSTRAINT concern_categories_name_key UNIQUE (name);


--
-- Name: concern_categories concern_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_categories
    ADD CONSTRAINT concern_categories_pkey PRIMARY KEY (id);


--
-- Name: concern_messages concern_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_messages
    ADD CONSTRAINT concern_messages_pkey PRIMARY KEY (id);


--
-- Name: concern_referrals concern_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_referrals
    ADD CONSTRAINT concern_referrals_pkey PRIMARY KEY (id);


--
-- Name: concern_status_history concern_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_status_history
    ADD CONSTRAINT concern_status_history_pkey PRIMARY KEY (id);


--
-- Name: concerns concerns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concerns
    ADD CONSTRAINT concerns_pkey PRIMARY KEY (id);


--
-- Name: concerns concerns_reference_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concerns
    ADD CONSTRAINT concerns_reference_no_key UNIQUE (reference_no);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_student_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_student_number_key UNIQUE (student_number);


--
-- Name: auth_sessions_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_sessions_expiry_idx ON public.auth_sessions USING btree (expires_at);


--
-- Name: auth_sessions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_sessions_user_idx ON public.auth_sessions USING btree (user_id);


--
-- Name: idx_assignment_one_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_assignment_one_active ON public.concern_assignments USING btree (concern_id) WHERE (ended_at IS NULL);


--
-- Name: idx_assignments_personnel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_personnel ON public.concern_assignments USING btree (assigned_to, ended_at);


--
-- Name: idx_attachments_concern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_concern ON public.concern_attachments USING btree (concern_id);


--
-- Name: idx_audit_logs_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_actor ON public.audit_logs USING btree (actor_user_id, created_at DESC);


--
-- Name: idx_audit_logs_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_time ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_concerns_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concerns_category ON public.concerns USING btree (category_id);


--
-- Name: idx_concerns_status_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concerns_status_date ON public.concerns USING btree (status, created_at DESC);


--
-- Name: idx_concerns_student_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concerns_student_date ON public.concerns USING btree (student_id, created_at DESC);


--
-- Name: idx_messages_concern_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_concern_date ON public.concern_messages USING btree (concern_id, created_at);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, created_at DESC) WHERE (is_read = false);


--
-- Name: idx_referrals_concern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_concern ON public.concern_referrals USING btree (concern_id, created_at DESC);


--
-- Name: idx_status_history_concern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_history_concern ON public.concern_status_history USING btree (concern_id, created_at);


--
-- Name: users_email_lower_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_lower_unique ON public.users USING btree (lower((email)::text));


--
-- Name: concern_categories categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.concern_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: concerns concerns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER concerns_updated_at BEFORE UPDATE ON public.concerns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: faqs faqs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER faqs_updated_at BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: concern_referrals referrals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER referrals_updated_at BEFORE UPDATE ON public.concern_referrals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: system_settings settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: audit_logs audit_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: auth_sessions auth_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: concern_assignments concern_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_assignments
    ADD CONSTRAINT concern_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: concern_assignments concern_assignments_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_assignments
    ADD CONSTRAINT concern_assignments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: concern_assignments concern_assignments_concern_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_assignments
    ADD CONSTRAINT concern_assignments_concern_id_fkey FOREIGN KEY (concern_id) REFERENCES public.concerns(id) ON DELETE RESTRICT;


--
-- Name: concern_attachments concern_attachments_concern_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_attachments
    ADD CONSTRAINT concern_attachments_concern_id_fkey FOREIGN KEY (concern_id) REFERENCES public.concerns(id) ON DELETE RESTRICT;


--
-- Name: concern_attachments concern_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_attachments
    ADD CONSTRAINT concern_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: concern_messages concern_messages_concern_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_messages
    ADD CONSTRAINT concern_messages_concern_id_fkey FOREIGN KEY (concern_id) REFERENCES public.concerns(id) ON DELETE RESTRICT;


--
-- Name: concern_messages concern_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_messages
    ADD CONSTRAINT concern_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: concern_referrals concern_referrals_concern_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_referrals
    ADD CONSTRAINT concern_referrals_concern_id_fkey FOREIGN KEY (concern_id) REFERENCES public.concerns(id) ON DELETE RESTRICT;


--
-- Name: concern_referrals concern_referrals_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_referrals
    ADD CONSTRAINT concern_referrals_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: concern_referrals concern_referrals_referred_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_referrals
    ADD CONSTRAINT concern_referrals_referred_to_fkey FOREIGN KEY (referred_to) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: concern_referrals concern_referrals_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_referrals
    ADD CONSTRAINT concern_referrals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: concern_status_history concern_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_status_history
    ADD CONSTRAINT concern_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: concern_status_history concern_status_history_concern_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concern_status_history
    ADD CONSTRAINT concern_status_history_concern_id_fkey FOREIGN KEY (concern_id) REFERENCES public.concerns(id) ON DELETE RESTRICT;


--
-- Name: concerns concerns_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concerns
    ADD CONSTRAINT concerns_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.concern_categories(id) ON DELETE RESTRICT;


--
-- Name: concerns concerns_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concerns
    ADD CONSTRAINT concerns_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: faqs faqs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_concern_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_concern_id_fkey FOREIGN KEY (concern_id) REFERENCES public.concerns(id) ON DELETE RESTRICT;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


RESET search_path;
