-- ============================================================
-- Keel Pipeline — Supabase Schema
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- OFFICERS (supply side)
-- ============================================================
CREATE TABLE IF NOT EXISTS officers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  title           text,
  council         text NOT NULL,
  borough         text,
  email           text,
  phone           text,
  temp            text NOT NULL DEFAULT 'warm' CHECK (temp IN ('hot', 'warm', 'cool')),
  score           integer DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  referrals_30d   integer DEFAULT 0,
  signed_30d      integer DEFAULT 0,
  fees_generated  integer DEFAULT 0,
  avg_fee_split   numeric(4,2) DEFAULT 0.40,
  active_leads    integer DEFAULT 0,
  last_contact_at timestamptz,
  first_referral  date,
  tenure_months   integer DEFAULT 0,
  response_hrs    integer DEFAULT 24,
  conversion_pct  integer DEFAULT 0,
  prefers_sms     boolean DEFAULT false,
  notes           text,
  streak          jsonb DEFAULT '[]'::jsonb,  -- array of 0/1 for last 30 days
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- LEADS (demand side)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  phone           text,
  email           text,
  source          text NOT NULL DEFAULT 'whatsapp'
                    CHECK (source IN ('website', 'whatsapp', 'officer', 'chatgpt', 'referral')),
  officer_id      uuid REFERENCES officers(id) ON DELETE SET NULL,
  officer_name    text,             -- denormalised for fast reads
  council         text NOT NULL,
  borough         text,
  status          text NOT NULL DEFAULT 'lead'
                    CHECK (status IN ('lead', 'qualified', 'viewing', 'application', 'referencing', 'signed', 'dead')),
  value           integer,          -- total fee in £
  operator_split  numeric(4,2) DEFAULT 0.45,
  partner_split   numeric(4,2) DEFAULT 0.40,
  council_fee     numeric(4,2) DEFAULT 0.15,
  last_contact_at timestamptz,
  next_action     text,
  next_action_due date,
  failure_reason  text,
  composition     text,             -- household description
  benefits        text,
  notes           text,
  -- embedded property (no separate table needed for MVP)
  property_address  text,
  property_beds     integer,
  property_ppm      integer,        -- price per month
  property_available text,
  pinned          boolean DEFAULT false,
  split_structure jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ACTIVITY LOG (timeline per lead)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id   uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type      text NOT NULL CHECK (type IN ('note', 'call', 'email', 'status')),
  actor     text NOT NULL DEFAULT 'You',
  text      text NOT NULL,
  body      text,
  meta      jsonb DEFAULT '{}'::jsonb,  -- e.g. {from: 'qualified', to: 'viewing'}
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- EOD REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS eod_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date  date NOT NULL UNIQUE,
  data         jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tone      text NOT NULL CHECK (tone IN ('r', 'a', 'g', 'b')),
  title     text NOT NULL,
  message   text NOT NULL,
  lead_id   uuid REFERENCES leads(id) ON DELETE CASCADE,
  read      boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS leads_status_idx       ON leads(status);
CREATE INDEX IF NOT EXISTS leads_council_idx      ON leads(council);
CREATE INDEX IF NOT EXISTS leads_last_contact_idx ON leads(last_contact_at);
CREATE INDEX IF NOT EXISTS leads_created_idx      ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_lead_idx      ON activity_log(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_read_idx         ON notifications(read, created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER (auto-updates updated_at on any row change)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER officers_updated_at
  BEFORE UPDATE ON officers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY — single user, auth.uid() based
-- ============================================================
ALTER TABLE leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE officers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE eod_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- Allow all operations for any authenticated user
-- (single-user app — you're the only one with credentials)
CREATE POLICY "auth_all_leads"         ON leads         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_officers"      ON officers      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_activity"      ON activity_log  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_eod"           ON eod_reports   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_notifications" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA (optional — matches your prototype)
-- Delete this block after initial setup if you don't want fake data
-- ============================================================
/*

INSERT INTO officers (name, title, council, borough, email, phone, temp, score,
  referrals_30d, signed_30d, fees_generated, response_hrs, prefers_sms, notes)
VALUES
  ('Marcus Webb', 'Senior Housing Officer', 'RBKC', 'Kensington & Chelsea',
   'm.webb@rbkc.gov.uk', '+44 20 7361 3000', 'hot', 92,
   6, 3, 5825, 4, true,
   'Best officer by far. Refers DSS-friendly landlords directly. Likes weekly Friday updates by WhatsApp.'),
  ('Helena Diaz', 'Housing Solutions Officer', 'Islington', 'Finsbury Park',
   'h.diaz@islington.gov.uk', '+44 20 7527 6000', 'warm', 68,
   3, 1, 2100, 18, false,
   'Methodical. Needs full documentation before referring. Don''t push — let her drive cadence.'),
  ('Aisha Begum', 'Housing Officer', 'Newham', 'Stratford',
   'a.begum@newham.gov.uk', '+44 20 8430 2000', 'hot', 78,
   4, 2, 3450, 8, true,
   'New officer, eager. Lots of bedroom-tax cases. Volume is high but tenant quality variable.');

*/
