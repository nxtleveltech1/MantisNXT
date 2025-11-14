--
-- PostgreSQL database dump
--

\restrict PktdTIjETfMpE9UMDgasp2VLYuwwbR8k8YgCV1dUZWBhuWIXQwh9KkDygxrCwii

-- Dumped from database version 17.5 (aa1f746)
-- Dumped by pg_dump version 17.6

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: inventory_item; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_item (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    org_id uuid NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    description text,
    category public.inventory_category NOT NULL,
    unit_price numeric(10,2) DEFAULT 0,
    quantity_on_hand integer DEFAULT 0,
    reorder_point integer DEFAULT 0,
    max_stock_level integer,
    unit_of_measure text DEFAULT 'each'::text,
    supplier_id uuid,
    barcode text,
    location text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    brand_id uuid,
    weight_kg numeric(8,3),
    dimensions_json jsonb DEFAULT '{}'::jsonb,
    batch_tracking boolean DEFAULT false,
    expiry_tracking boolean DEFAULT false,
    serial_tracking boolean DEFAULT false,
    default_vat_rate_type public.vat_rate_type DEFAULT 'standard'::public.vat_rate_type,
    default_vat_rate numeric(5,2) DEFAULT 15.00,
    cost_price numeric(10,2) DEFAULT 0.00,
    markup_percentage numeric(5,2) DEFAULT 0.00,
    alternative_skus text[] DEFAULT '{}'::text[],
    tags text[] DEFAULT '{}'::text[],
    CONSTRAINT inventory_cost_price_positive CHECK ((cost_price >= (0)::numeric)),
    CONSTRAINT inventory_max_stock_positive CHECK (((max_stock_level IS NULL) OR (max_stock_level > 0))),
    CONSTRAINT inventory_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 200))),
    CONSTRAINT inventory_quantity_non_negative CHECK ((quantity_on_hand >= 0)),
    CONSTRAINT inventory_reorder_point_non_negative CHECK ((reorder_point >= 0)),
    CONSTRAINT inventory_unit_price_positive CHECK ((unit_price >= (0)::numeric)),
    CONSTRAINT inventory_vat_rate_range CHECK (((default_vat_rate >= (0)::numeric) AND (default_vat_rate <= (100)::numeric))),
    CONSTRAINT inventory_weight_positive CHECK (((weight_kg IS NULL) OR (weight_kg >= (0)::numeric)))
);


ALTER TABLE public.inventory_item OWNER TO neondb_owner;

--
-- Name: inventory_item inventory_item_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_item
    ADD CONSTRAINT inventory_item_pkey PRIMARY KEY (id);


--
-- Name: inventory_item inventory_sku_org_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_item
    ADD CONSTRAINT inventory_sku_org_unique UNIQUE (org_id, sku);


--
-- Name: inventory_item inventory_item_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_item
    ADD CONSTRAINT inventory_item_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brand(id) ON DELETE SET NULL;


--
-- Name: inventory_item inventory_item_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_item
    ADD CONSTRAINT inventory_item_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organization(id) ON DELETE CASCADE;


--
-- Name: inventory_item inventory_item_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_item
    ADD CONSTRAINT inventory_item_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict PktdTIjETfMpE9UMDgasp2VLYuwwbR8k8YgCV1dUZWBhuWIXQwh9KkDygxrCwii

