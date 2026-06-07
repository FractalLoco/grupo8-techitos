--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2026-06-07 03:23:37

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
-- TOC entry 4 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 5007 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 17784)
-- Name: cuadrillas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cuadrillas (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    jefe_id integer NOT NULL,
    emergencia_id integer NOT NULL,
    obra_asignada_id integer,
    estado character varying(20) DEFAULT 'activa'::character varying NOT NULL,
    fase character varying(20),
    plazo_dias integer DEFAULT 5 NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_asignacion timestamp without time zone,
    fecha_completada timestamp without time zone,
    alerta_emergencia boolean DEFAULT false NOT NULL,
    descripcion_emergencia text,
    CONSTRAINT "CHK_44c52b03149528602ca1776d5e" CHECK ((((fase)::text = ANY ((ARRAY['limpieza'::character varying, 'montaje'::character varying, 'terminaciones'::character varying])::text[])) OR (fase IS NULL))),
    CONSTRAINT "CHK_4e06d76cf00774015e3c5ad96c" CHECK (((estado)::text = ANY ((ARRAY['activa'::character varying, 'en_progreso'::character varying, 'completada'::character varying, 'desarmada'::character varying])::text[])))
);


ALTER TABLE public.cuadrillas OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 17783)
-- Name: cuadrillas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cuadrillas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cuadrillas_id_seq OWNER TO postgres;

--
-- TOC entry 5008 (class 0 OID 0)
-- Dependencies: 225
-- Name: cuadrillas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cuadrillas_id_seq OWNED BY public.cuadrillas.id;


--
-- TOC entry 220 (class 1259 OID 17749)
-- Name: emergencias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emergencias (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    estado character varying(20) DEFAULT 'activa'::character varying NOT NULL,
    lat double precision,
    lng double precision,
    fecha_inicio timestamp without time zone DEFAULT now() NOT NULL,
    fecha_fin timestamp without time zone,
    CONSTRAINT "CHK_785b23f801d8052c91e35184c7" CHECK (((estado)::text = ANY ((ARRAY['activa'::character varying, 'finalizada'::character varying])::text[])))
);


ALTER TABLE public.emergencias OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 17748)
-- Name: emergencias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emergencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emergencias_id_seq OWNER TO postgres;

--
-- TOC entry 5009 (class 0 OID 0)
-- Dependencies: 219
-- Name: emergencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emergencias_id_seq OWNED BY public.emergencias.id;


--
-- TOC entry 224 (class 1259 OID 17772)
-- Name: evaluaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evaluaciones (
    id integer NOT NULL,
    emergencia_id integer NOT NULL,
    familia_id integer NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    observaciones text,
    CONSTRAINT "CHK_fcad4ee63c86641db58e662f20" CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en_proceso'::character varying, 'completada'::character varying])::text[])))
);


ALTER TABLE public.evaluaciones OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 17771)
-- Name: evaluaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.evaluaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.evaluaciones_id_seq OWNER TO postgres;

--
-- TOC entry 5010 (class 0 OID 0)
-- Dependencies: 223
-- Name: evaluaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.evaluaciones_id_seq OWNED BY public.evaluaciones.id;


--
-- TOC entry 222 (class 1259 OID 17761)
-- Name: familias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.familias (
    id integer NOT NULL,
    emergencia_id integer NOT NULL,
    nombre_cabeza_familia character varying(150) NOT NULL,
    direccion character varying(200),
    lat double precision,
    lng double precision,
    miembros integer DEFAULT 1 NOT NULL,
    prioridad character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_0a9eb80087c886b1b2d1047bf6" CHECK (((prioridad)::text = ANY ((ARRAY['alta'::character varying, 'normal'::character varying, 'baja'::character varying])::text[])))
);


ALTER TABLE public.familias OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 17760)
-- Name: familias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.familias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.familias_id_seq OWNER TO postgres;

--
-- TOC entry 5011 (class 0 OID 0)
-- Dependencies: 221
-- Name: familias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.familias_id_seq OWNED BY public.familias.id;


--
-- TOC entry 230 (class 1259 OID 17809)
-- Name: herramientas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.herramientas (
    id integer NOT NULL,
    cuadrilla_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    estado character varying(20) DEFAULT 'entregada'::character varying NOT NULL,
    fecha_registro timestamp without time zone DEFAULT now() NOT NULL,
    observaciones text,
    CONSTRAINT "CHK_bc5dbd9b37b64a4c294fedfe8f" CHECK (((estado)::text = ANY ((ARRAY['entregada'::character varying, 'buena'::character varying, 'danada'::character varying, 'perdida'::character varying, 'no_devuelta'::character varying])::text[])))
);


ALTER TABLE public.herramientas OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 17808)
-- Name: herramientas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.herramientas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.herramientas_id_seq OWNER TO postgres;

--
-- TOC entry 5012 (class 0 OID 0)
-- Dependencies: 229
-- Name: herramientas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.herramientas_id_seq OWNED BY public.herramientas.id;


--
-- TOC entry 232 (class 1259 OID 17863)
-- Name: mensajes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mensajes (
    id integer NOT NULL,
    remitente_id integer NOT NULL,
    cuadrilla_id integer,
    tipo character varying(50) DEFAULT 'texto'::character varying,
    contenido text,
    archivo_url text,
    prioridad boolean DEFAULT false,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mensajes OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 17862)
-- Name: mensajes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mensajes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mensajes_id_seq OWNER TO postgres;

--
-- TOC entry 5013 (class 0 OID 0)
-- Dependencies: 231
-- Name: mensajes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mensajes_id_seq OWNED BY public.mensajes.id;


--
-- TOC entry 228 (class 1259 OID 17799)
-- Name: miembros_cuadrilla; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.miembros_cuadrilla (
    id integer NOT NULL,
    cuadrilla_id integer NOT NULL,
    voluntario_id integer NOT NULL,
    habilidades text,
    fecha_asignacion timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.miembros_cuadrilla OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 17798)
-- Name: miembros_cuadrilla_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.miembros_cuadrilla_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.miembros_cuadrilla_id_seq OWNER TO postgres;

--
-- TOC entry 5014 (class 0 OID 0)
-- Dependencies: 227
-- Name: miembros_cuadrilla_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.miembros_cuadrilla_id_seq OWNED BY public.miembros_cuadrilla.id;


--
-- TOC entry 218 (class 1259 OID 17735)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    rut character varying(12) NOT NULL,
    correo character varying(100) NOT NULL,
    contrasena character varying(255) NOT NULL,
    rol character varying(20) NOT NULL,
    activo boolean DEFAULT false NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_bb8fd2adcb5049aee597b023ff" CHECK (((rol)::text = ANY ((ARRAY['coordinador'::character varying, 'jefe_cuadrilla'::character varying, 'voluntario'::character varying])::text[])))
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 17734)
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- TOC entry 5015 (class 0 OID 0)
-- Dependencies: 217
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- TOC entry 4790 (class 2604 OID 17787)
-- Name: cuadrillas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cuadrillas ALTER COLUMN id SET DEFAULT nextval('public.cuadrillas_id_seq'::regclass);


--
-- TOC entry 4780 (class 2604 OID 17752)
-- Name: emergencias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergencias ALTER COLUMN id SET DEFAULT nextval('public.emergencias_id_seq'::regclass);


--
-- TOC entry 4787 (class 2604 OID 17775)
-- Name: evaluaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluaciones ALTER COLUMN id SET DEFAULT nextval('public.evaluaciones_id_seq'::regclass);


--
-- TOC entry 4783 (class 2604 OID 17764)
-- Name: familias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familias ALTER COLUMN id SET DEFAULT nextval('public.familias_id_seq'::regclass);


--
-- TOC entry 4797 (class 2604 OID 17812)
-- Name: herramientas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.herramientas ALTER COLUMN id SET DEFAULT nextval('public.herramientas_id_seq'::regclass);


--
-- TOC entry 4800 (class 2604 OID 17866)
-- Name: mensajes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes ALTER COLUMN id SET DEFAULT nextval('public.mensajes_id_seq'::regclass);


--
-- TOC entry 4795 (class 2604 OID 17802)
-- Name: miembros_cuadrilla id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.miembros_cuadrilla ALTER COLUMN id SET DEFAULT nextval('public.miembros_cuadrilla_id_seq'::regclass);


--
-- TOC entry 4777 (class 2604 OID 17738)
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- TOC entry 4995 (class 0 OID 17784)
-- Dependencies: 226
-- Data for Name: cuadrillas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cuadrillas (id, nombre, jefe_id, emergencia_id, obra_asignada_id, estado, fase, plazo_dias, fecha_creacion, fecha_asignacion, fecha_completada, alerta_emergencia, descripcion_emergencia) FROM stdin;
\.


--
-- TOC entry 4989 (class 0 OID 17749)
-- Dependencies: 220
-- Data for Name: emergencias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.emergencias (id, nombre, descripcion, estado, lat, lng, fecha_inicio, fecha_fin) FROM stdin;
2	Incendio Estructural Con Peligro De Propagación	Riesgo de propagación debido a materiales inflamables.	activa	24	-23	2026-05-22 04:49:31.959972	\N
\.


--
-- TOC entry 4993 (class 0 OID 17772)
-- Dependencies: 224
-- Data for Name: evaluaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluaciones (id, emergencia_id, familia_id, estado, fecha, observaciones) FROM stdin;
\.


--
-- TOC entry 4991 (class 0 OID 17761)
-- Dependencies: 222
-- Data for Name: familias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.familias (id, emergencia_id, nombre_cabeza_familia, direccion, lat, lng, miembros, prioridad, creado_en) FROM stdin;
\.


--
-- TOC entry 4999 (class 0 OID 17809)
-- Dependencies: 230
-- Data for Name: herramientas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.herramientas (id, cuadrilla_id, nombre, estado, fecha_registro, observaciones) FROM stdin;
\.


--
-- TOC entry 5001 (class 0 OID 17863)
-- Dependencies: 232
-- Data for Name: mensajes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mensajes (id, remitente_id, cuadrilla_id, tipo, contenido, archivo_url, prioridad, creado_en) FROM stdin;
\.


--
-- TOC entry 4997 (class 0 OID 17799)
-- Dependencies: 228
-- Data for Name: miembros_cuadrilla; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.miembros_cuadrilla (id, cuadrilla_id, voluntario_id, habilidades, fecha_asignacion) FROM stdin;
\.


--
-- TOC entry 4987 (class 0 OID 17735)
-- Dependencies: 218
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, nombre, rut, correo, contrasena, rol, activo, creado_en) FROM stdin;
1	Coordinador Principal	12345678-9	coordinador@techo.cl	$2a$10$NqfrbruW3XscJjc/uKeQLeLFTyQLnNOsBULwJdztcmIis47so2Seq	coordinador	t	2026-05-14 21:34:48.701095
2	Jefe Cuadrilla Uno	98765432-1	jefe@techo.cl	$2a$10$NqfrbruW3XscJjc/uKeQLeLFTyQLnNOsBULwJdztcmIis47so2Seq	jefe_cuadrilla	t	2026-05-14 21:34:48.701095
3	Voluntario Uno	11111111-1	voluntario@techo.cl	$2a$10$NqfrbruW3XscJjc/uKeQLeLFTyQLnNOsBULwJdztcmIis47so2Seq	voluntario	t	2026-05-14 21:34:48.701095
4	Rodrigo Sebastián Alarcón Venegas	21570482-3	rodriseralarcon98@gmail.com	$2a$10$E0z1pm4e3QbcZPg2iVWdlO1HfSRVlu8rTibpVfOAs2cR8ToERiTZO	voluntario	t	2026-05-19 05:51:18.259634
5	Ana Coordinadora	11.111.111-1	coordinador@techo.org	$2b$10$Jc5.Ee.p7a3f.7g/bJgZ3.wzNf9D.aJgSj.Z.z.z.z.z.z	coordinador	f	2026-06-05 04:00:59.820502
6	Juan Jefe	22.222.222-2	jefe@techo.org	$2b$10$Jc5.Ee.p7a3f.7g/bJgZ3.wzNf9D.aJgSj.Z.z.z.z.z.z	jefe_cuadrilla	f	2026-06-05 04:00:59.820502
7	Pedro Voluntario	33.333.333-3	voluntario@techo.org	$2b$10$Jc5.Ee.p7a3f.7g/bJgZ3.wzNf9D.aJgSj.Z.z.z.z.z.z	voluntario	f	2026-06-05 04:00:59.820502
\.


--
-- TOC entry 5016 (class 0 OID 0)
-- Dependencies: 225
-- Name: cuadrillas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cuadrillas_id_seq', 2, true);


--
-- TOC entry 5017 (class 0 OID 0)
-- Dependencies: 219
-- Name: emergencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.emergencias_id_seq', 2, true);


--
-- TOC entry 5018 (class 0 OID 0)
-- Dependencies: 223
-- Name: evaluaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.evaluaciones_id_seq', 1, false);


--
-- TOC entry 5019 (class 0 OID 0)
-- Dependencies: 221
-- Name: familias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.familias_id_seq', 1, false);


--
-- TOC entry 5020 (class 0 OID 0)
-- Dependencies: 229
-- Name: herramientas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.herramientas_id_seq', 1, false);


--
-- TOC entry 5021 (class 0 OID 0)
-- Dependencies: 231
-- Name: mensajes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mensajes_id_seq', 1, false);


--
-- TOC entry 5022 (class 0 OID 0)
-- Dependencies: 227
-- Name: miembros_cuadrilla_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.miembros_cuadrilla_id_seq', 1, false);


--
-- TOC entry 5023 (class 0 OID 0)
-- Dependencies: 217
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 7, true);


--
-- TOC entry 4822 (class 2606 OID 17782)
-- Name: evaluaciones PK_3b157bcce651495e675cdf96a14; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT "PK_3b157bcce651495e675cdf96a14" PRIMARY KEY (id);


--
-- TOC entry 4826 (class 2606 OID 17807)
-- Name: miembros_cuadrilla PK_4b36f616f9bcd979bf52a3aaeeb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.miembros_cuadrilla
    ADD CONSTRAINT "PK_4b36f616f9bcd979bf52a3aaeeb" PRIMARY KEY (id);


--
-- TOC entry 4824 (class 2606 OID 17797)
-- Name: cuadrillas PK_55d242f929c7b92e8dab5d98974; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cuadrillas
    ADD CONSTRAINT "PK_55d242f929c7b92e8dab5d98974" PRIMARY KEY (id);


--
-- TOC entry 4818 (class 2606 OID 17759)
-- Name: emergencias PK_abd04610b1731023b1c8f0ef7c9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergencias
    ADD CONSTRAINT "PK_abd04610b1731023b1c8f0ef7c9" PRIMARY KEY (id);


--
-- TOC entry 4828 (class 2606 OID 17819)
-- Name: herramientas PK_bd66a4cd9d857c6f45c476b09b8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.herramientas
    ADD CONSTRAINT "PK_bd66a4cd9d857c6f45c476b09b8" PRIMARY KEY (id);


--
-- TOC entry 4820 (class 2606 OID 17770)
-- Name: familias PK_d812f1967f7a65a687f6b607e8a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familias
    ADD CONSTRAINT "PK_d812f1967f7a65a687f6b607e8a" PRIMARY KEY (id);


--
-- TOC entry 4830 (class 2606 OID 17873)
-- Name: mensajes mensajes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_pkey PRIMARY KEY (id);


--
-- TOC entry 4812 (class 2606 OID 17747)
-- Name: usuarios usuarios_correo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);


--
-- TOC entry 4814 (class 2606 OID 17743)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 4816 (class 2606 OID 17745)
-- Name: usuarios usuarios_rut_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_rut_key UNIQUE (rut);


--
-- TOC entry 4832 (class 2606 OID 17831)
-- Name: evaluaciones FK_1b442bdd0f4640bede4ac030b74; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT "FK_1b442bdd0f4640bede4ac030b74" FOREIGN KEY (familia_id) REFERENCES public.familias(id);


--
-- TOC entry 4836 (class 2606 OID 17851)
-- Name: miembros_cuadrilla FK_200e09220662469040066187556; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.miembros_cuadrilla
    ADD CONSTRAINT "FK_200e09220662469040066187556" FOREIGN KEY (voluntario_id) REFERENCES public.usuarios(id);


--
-- TOC entry 4834 (class 2606 OID 17836)
-- Name: cuadrillas FK_cd337533c7a836b2a5d88178eb7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cuadrillas
    ADD CONSTRAINT "FK_cd337533c7a836b2a5d88178eb7" FOREIGN KEY (emergencia_id) REFERENCES public.emergencias(id);


--
-- TOC entry 4837 (class 2606 OID 17846)
-- Name: miembros_cuadrilla FK_d80a78b444fdb4648b8086bf546; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.miembros_cuadrilla
    ADD CONSTRAINT "FK_d80a78b444fdb4648b8086bf546" FOREIGN KEY (cuadrilla_id) REFERENCES public.cuadrillas(id) ON DELETE CASCADE;


--
-- TOC entry 4838 (class 2606 OID 17856)
-- Name: herramientas FK_d9a26a3e515ac124acc5df3c2ce; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.herramientas
    ADD CONSTRAINT "FK_d9a26a3e515ac124acc5df3c2ce" FOREIGN KEY (cuadrilla_id) REFERENCES public.cuadrillas(id);


--
-- TOC entry 4835 (class 2606 OID 17841)
-- Name: cuadrillas FK_e24aec3936002848de322036342; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cuadrillas
    ADD CONSTRAINT "FK_e24aec3936002848de322036342" FOREIGN KEY (jefe_id) REFERENCES public.usuarios(id);


--
-- TOC entry 4831 (class 2606 OID 17821)
-- Name: familias FK_f1c0d0cf8d7b5f3ba951243b53e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.familias
    ADD CONSTRAINT "FK_f1c0d0cf8d7b5f3ba951243b53e" FOREIGN KEY (emergencia_id) REFERENCES public.emergencias(id);


--
-- TOC entry 4833 (class 2606 OID 17826)
-- Name: evaluaciones FK_fe5d07f420948ea88e6c46ec92a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluaciones
    ADD CONSTRAINT "FK_fe5d07f420948ea88e6c46ec92a" FOREIGN KEY (emergencia_id) REFERENCES public.emergencias(id);


--
-- TOC entry 4839 (class 2606 OID 17879)
-- Name: mensajes mensajes_cuadrilla_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_cuadrilla_id_fkey FOREIGN KEY (cuadrilla_id) REFERENCES public.cuadrillas(id);


--
-- TOC entry 4840 (class 2606 OID 17874)
-- Name: mensajes mensajes_remitente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensajes
    ADD CONSTRAINT mensajes_remitente_id_fkey FOREIGN KEY (remitente_id) REFERENCES public.usuarios(id);


-- Completed on 2026-06-07 03:23:37

--
-- PostgreSQL database dump complete
--

