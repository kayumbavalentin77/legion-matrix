
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin','administrator','personnel_officer','logistics_officer','medical_officer','vehicle_officer','equipment_officer','viewer');

-- UPDATED AT
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  username TEXT,
  email TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role <> 'viewer');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','administrator'));
$$;

CREATE OR REPLACE FUNCTION public.can_read_medical()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','administrator','medical_officer'));
$$;

CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "admin manage profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "roles readable" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_user BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO first_user;
  INSERT INTO public.profiles (id, full_name, email, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email, split_part(COALESCE(NEW.email,''),'@',1));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN first_user THEN 'super_admin'::public.app_role ELSE 'viewer'::public.app_role END);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- UNITS
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.soldiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  rank TEXT NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  gender TEXT,
  date_of_birth DATE,
  nationality TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  position TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  date_joined DATE,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id UUID REFERENCES public.soldiers(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  training_date DATE,
  result TEXT,
  instructor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fitness_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id UUID REFERENCES public.soldiers(id) ON DELETE CASCADE,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  running_time TEXT,
  push_ups INTEGER,
  sit_ups INTEGER,
  score INTEGER,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id UUID REFERENCES public.soldiers(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_type TEXT,
  status TEXT,
  fitness_restriction TEXT,
  return_to_duty DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  serial_number TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.soldiers(id) ON DELETE SET NULL,
  date_acquired DATE,
  status TEXT NOT NULL DEFAULT 'Available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ammunition_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL,
  type TEXT NOT NULL,
  batch_number TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  storage_location TEXT,
  condition TEXT,
  inspection_date DATE,
  status TEXT NOT NULL DEFAULT 'Available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ammunition_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ammunition_id UUID REFERENCES public.ammunition_inventory(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  performed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_code TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  type TEXT,
  model TEXT,
  manufacturer TEXT,
  year INTEGER,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  driver TEXT,
  status TEXT NOT NULL DEFAULT 'Operational',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicle_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  maintenance_type TEXT,
  maintenance_date DATE,
  technician TEXT,
  cost NUMERIC(12,2),
  description TEXT,
  next_maintenance_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicle_faults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  fault_type TEXT,
  description TEXT,
  reported_by TEXT,
  report_date DATE DEFAULT CURRENT_DATE,
  priority TEXT DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicle_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL,
  title TEXT NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  responsible_officer TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Draft',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  author TEXT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  document_date DATE DEFAULT CURRENT_DATE,
  classification TEXT NOT NULL DEFAULT 'Internal',
  file_path TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  operation_id UUID REFERENCES public.operations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.security_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT,
  location TEXT,
  category TEXT,
  description TEXT,
  reliability TEXT,
  risk_level TEXT DEFAULT 'Low',
  status TEXT NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  minimum_level INTEGER NOT NULL DEFAULT 0,
  unit_of_measure TEXT DEFAULT 'pcs',
  storage_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  performed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  module TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  module TEXT,
  record_ref TEXT,
  description TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Facility',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  classification TEXT DEFAULT 'Internal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GRANTS + RLS + POLICIES for general tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['units','soldiers','training_records','fitness_records','equipment','ammunition_inventory','ammunition_transactions','vehicles','vehicle_maintenance','vehicle_faults','vehicle_locations','operations','documents','security_reports','inventory','inventory_transactions','notifications','system_settings','locations']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "read_all_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (true);', t);
    EXECUTE format('CREATE POLICY "write_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.can_write());', t);
    EXECUTE format('CREATE POLICY "update_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.can_write());', t);
    EXECUTE format('CREATE POLICY "delete_%1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.can_write());', t);
    EXECUTE format('CREATE TRIGGER set_updated_at_%1$s BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

-- MEDICAL: restricted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_records TO authenticated;
GRANT ALL ON public.medical_records TO service_role;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medical_read" ON public.medical_records FOR SELECT TO authenticated USING (public.can_read_medical());
CREATE POLICY "medical_insert" ON public.medical_records FOR INSERT TO authenticated WITH CHECK (public.can_read_medical());
CREATE POLICY "medical_update" ON public.medical_records FOR UPDATE TO authenticated USING (public.can_read_medical());
CREATE POLICY "medical_delete" ON public.medical_records FOR DELETE TO authenticated USING (public.can_read_medical());
CREATE TRIGGER set_updated_at_medical BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUDIT LOGS: read-only, insert by any authenticated
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_read" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_soldiers_unit ON public.soldiers(unit_id);
CREATE INDEX idx_equipment_unit ON public.equipment(unit_id);
CREATE INDEX idx_vehicles_unit ON public.vehicles(unit_id);
CREATE INDEX idx_fitness_soldier ON public.fitness_records(soldier_id);
CREATE INDEX idx_medical_soldier ON public.medical_records(soldier_id);

-- ============ SAMPLE DATA ============
INSERT INTO public.units (id, name, code, location, latitude, longitude) VALUES
 ('11111111-1111-1111-1111-111111111101','1st Infantry Battalion','1IB','Northern Garrison',52.2297,21.0122),
 ('11111111-1111-1111-1111-111111111102','2nd Logistics Regiment','2LR','Central Depot',51.1079,17.0385),
 ('11111111-1111-1111-1111-111111111103','3rd Engineering Company','3EC','Eastern Base',50.0647,19.9450),
 ('11111111-1111-1111-1111-111111111104','Medical Support Unit','MSU','Central Hospital',54.3520,18.6466),
 ('11111111-1111-1111-1111-111111111105','Signals Company','SIG','Western Station',53.4285,14.5528);

INSERT INTO public.soldiers (service_number, full_name, rank, unit_id, gender, date_of_birth, nationality, phone, position, status, date_joined, is_sample) VALUES
 ('SN-1001','John Carter','Sergeant','11111111-1111-1111-1111-111111111101','Male','1990-04-12','National','+100000001','Squad Leader','Active','2012-06-01',true),
 ('SN-1002','Maria Lopez','Corporal','11111111-1111-1111-1111-111111111101','Female','1993-09-02','National','+100000002','Rifleman','Active','2015-02-11',true),
 ('SN-1003','Ahmed Hassan','Lieutenant','11111111-1111-1111-1111-111111111102','Male','1988-01-25','National','+100000003','Logistics Officer','Active','2010-08-19',true),
 ('SN-1004','Elena Novak','Captain','11111111-1111-1111-1111-111111111103','Female','1985-11-30','National','+100000004','Company Commander','Active','2008-03-15',true),
 ('SN-1005','David Kim','Private','11111111-1111-1111-1111-111111111101','Male','1999-07-21','National','+100000005','Rifleman','Active','2020-09-01',true),
 ('SN-1006','Sofia Rossi','Sergeant','11111111-1111-1111-1111-111111111104','Female','1991-02-14','National','+100000006','Medic','Active','2013-05-06',true),
 ('SN-1007','Peter Novak','Corporal','11111111-1111-1111-1111-111111111105','Male','1994-12-05','National','+100000007','Radio Operator','Active','2016-01-20',true),
 ('SN-1008','Anna Weber','Major','11111111-1111-1111-1111-111111111102','Female','1980-06-18','National','+100000008','Deputy Commander','Active','2004-10-01',true),
 ('SN-1009','Luis Fernandez','Private','11111111-1111-1111-1111-111111111103','Male','2000-03-09','National','+100000009','Sapper','Active','2021-04-12',true),
 ('SN-1010','Grace Okafor','Lieutenant','11111111-1111-1111-1111-111111111104','Female','1989-08-27','National','+100000010','Medical Officer','Active','2011-11-02',true),
 ('SN-1011','Tomas Berg','Sergeant','11111111-1111-1111-1111-111111111105','Male','1992-05-17','National','+100000011','Signals NCO','Active','2014-07-08',true),
 ('SN-1012','Nina Petrova','Corporal','11111111-1111-1111-1111-111111111101','Female','1996-10-11','National','+100000012','Driver','On Leave','2018-02-26',true),
 ('SN-1013','Omar Aziz','Private','11111111-1111-1111-1111-111111111102','Male','1998-01-03','National','+100000013','Storeman','Active','2019-06-17',true),
 ('SN-1014','Clara Dubois','Captain','11111111-1111-1111-1111-111111111105','Female','1986-09-23','National','+100000014','Signals Commander','Active','2009-01-05',true),
 ('SN-1015','Marcus Reid','Sergeant','11111111-1111-1111-1111-111111111103','Male','1990-12-19','National','+100000015','Engineer NCO','Active','2012-09-10',true),
 ('SN-1016','Ivy Chen','Private','11111111-1111-1111-1111-111111111104','Female','2001-04-30','National','+100000016','Medical Assistant','Active','2022-01-10',true),
 ('SN-1017','Hugo Silva','Corporal','11111111-1111-1111-1111-111111111102','Male','1995-07-14','National','+100000017','Quartermaster Clerk','Active','2017-03-21',true),
 ('SN-1018','Lena Ahmed','Lieutenant','11111111-1111-1111-1111-111111111101','Female','1987-02-08','National','+100000018','Platoon Commander','Active','2010-05-30',true),
 ('SN-1019','Victor Ilic','Private','11111111-1111-1111-1111-111111111105','Male','1997-11-01','National','+100000019','Technician','Inactive','2018-08-14',true),
 ('SN-1020','Sara Lindqvist','Sergeant','11111111-1111-1111-1111-111111111102','Female','1991-06-06','National','+100000020','Supply NCO','Active','2013-02-18',true),
 ('SN-1021','Ali Rahman','Corporal','11111111-1111-1111-1111-111111111103','Male','1993-03-13','National','+100000021','Sapper','Active','2015-10-05',true),
 ('SN-1022','Julia Meyer','Private','11111111-1111-1111-1111-111111111101','Female','2002-08-24','National','+100000022','Rifleman','Active','2022-09-01',true);

INSERT INTO public.fitness_records (soldier_id, test_date, running_time, push_ups, sit_ups, score, category)
SELECT s.id,
  (DATE '2026-01-15' + (row_number() OVER (ORDER BY s.service_number) * INTERVAL '5 day'))::date,
  '11:' || lpad(((row_number() OVER (ORDER BY s.service_number) % 50) + 10)::text,2,'0'),
  40 + (row_number() OVER (ORDER BY s.service_number) % 30)::int,
  45 + (row_number() OVER (ORDER BY s.service_number) % 25)::int,
  55 + (row_number() OVER (ORDER BY s.service_number) * 2 % 45)::int,
  CASE WHEN (row_number() OVER (ORDER BY s.service_number)) % 4 = 0 THEN 'Excellent'
       WHEN (row_number() OVER (ORDER BY s.service_number)) % 4 = 1 THEN 'Good'
       WHEN (row_number() OVER (ORDER BY s.service_number)) % 4 = 2 THEN 'Average'
       ELSE 'Needs Improvement' END
FROM public.soldiers s;

INSERT INTO public.training_records (soldier_id, course, training_date, result, instructor)
SELECT s.id, 'Basic Field Training', DATE '2025-05-10', 'Passed', 'Cpt. Elena Novak' FROM public.soldiers s LIMIT 12;

INSERT INTO public.medical_records (soldier_id, visit_date, visit_type, status, fitness_restriction, return_to_duty, notes)
SELECT s.id, DATE '2026-03-02', 'Routine Check-up', 'Closed', 'None', DATE '2026-03-03', 'Sample record - fit for duty.'
FROM public.soldiers s LIMIT 6;

INSERT INTO public.equipment (equipment_code, name, category, serial_number, quantity, condition, unit_id, date_acquired, status) VALUES
 ('EQ-001','Service Rifle (Registry)','Weapons Registry','SR-88231',1,'Good','11111111-1111-1111-1111-111111111101','2019-04-01','Available'),
 ('EQ-002','Service Rifle (Registry)','Weapons Registry','SR-88232',1,'Good','11111111-1111-1111-1111-111111111101','2019-04-01','Issued'),
 ('EQ-003','Sidearm (Registry)','Weapons Registry','SD-11002',1,'Fair','11111111-1111-1111-1111-111111111102','2018-07-12','Available'),
 ('EQ-004','Tactical Radio TR-500','Communication Equipment','TR-500-01',12,'Good','11111111-1111-1111-1111-111111111105','2021-01-15','Available'),
 ('EQ-005','Radio Battery Pack','Communication Equipment','BP-2201',40,'Good','11111111-1111-1111-1111-111111111105','2021-01-15','Issued'),
 ('EQ-006','Field Antenna Kit','Communication Equipment','AN-3301',8,'Good','11111111-1111-1111-1111-111111111105','2020-11-02','Available'),
 ('EQ-007','Ballistic Vest','Protective Equipment','BV-7781',60,'Good','11111111-1111-1111-1111-111111111101','2020-02-20','Issued'),
 ('EQ-008','Combat Helmet','Protective Equipment','CH-4412',60,'Good','11111111-1111-1111-1111-111111111101','2020-02-20','Available'),
 ('EQ-009','Night Vision Device','Technical Equipment','NV-0091',10,'Fair','11111111-1111-1111-1111-111111111103','2017-09-09','Under Maintenance'),
 ('EQ-010','Field Generator 5kW','Technical Equipment','GN-5001',4,'Good','11111111-1111-1111-1111-111111111102','2019-06-30','Available'),
 ('EQ-011','Water Purification Unit','Technical Equipment','WP-2210',2,'Good','11111111-1111-1111-1111-111111111102','2022-03-11','Available'),
 ('EQ-012','Field Tent (12-man)','General Equipment','FT-9001',25,'Fair','11111111-1111-1111-1111-111111111101','2016-05-05','Issued'),
 ('EQ-013','Sleeping Bag','General Equipment','SB-1200',120,'Good','11111111-1111-1111-1111-111111111101','2021-10-01','Available'),
 ('EQ-014','Toolkit Engineering','General Equipment','TK-3300',15,'Damaged','11111111-1111-1111-1111-111111111103','2015-08-08','Damaged'),
 ('EQ-015','Headset Comms','Communication Equipment','HS-6600',30,'Good','11111111-1111-1111-1111-111111111105','2022-06-14','Available'),
 ('EQ-016','Portable Charger Unit','Communication Equipment','PC-7700',20,'Good','11111111-1111-1111-1111-111111111105','2022-06-14','Available'),
 ('EQ-017','Field Medical Kit','General Equipment','MK-4400',35,'Good','11111111-1111-1111-1111-111111111104','2023-01-09','Issued');

INSERT INTO public.ammunition_inventory (item_code, type, batch_number, quantity, unit_id, storage_location, condition, inspection_date, status) VALUES
 ('AM-001','5.56mm Ball','B-2201',24000,'11111111-1111-1111-1111-111111111101','Depot A - Bay 1','Serviceable','2026-01-10','Available'),
 ('AM-002','7.62mm Ball','B-2202',18000,'11111111-1111-1111-1111-111111111102','Depot A - Bay 2','Serviceable','2026-01-10','Available'),
 ('AM-003','9mm Ball','B-2203',9000,'11111111-1111-1111-1111-111111111102','Depot B - Bay 1','Serviceable','2025-11-22','Available'),
 ('AM-004','Training Blank 5.56mm','B-2204',5000,'11111111-1111-1111-1111-111111111103','Depot B - Bay 3','Serviceable','2025-09-30','Issued'),
 ('AM-005','Signal Flare','B-2205',400,'11111111-1111-1111-1111-111111111105','Depot C - Bay 1','Inspection Due','2025-06-15','Under Inspection');

INSERT INTO public.vehicles (vehicle_code, registration_number, type, model, manufacturer, year, unit_id, driver, status) VALUES
 ('VH-001','MIL-1001','Utility Truck','U-4500','TruckCo',2018,'11111111-1111-1111-1111-111111111102','Nina Petrova','Operational'),
 ('VH-002','MIL-1002','Utility Truck','U-4500','TruckCo',2019,'11111111-1111-1111-1111-111111111102','Omar Aziz','Maintenance'),
 ('VH-003','MIL-1003','Light Vehicle','LV-200','AutoWorks',2020,'11111111-1111-1111-1111-111111111101','John Carter','Operational'),
 ('VH-004','MIL-1004','Ambulance','AMB-300','MedMobile',2021,'11111111-1111-1111-1111-111111111104','Sofia Rossi','Operational'),
 ('VH-005','MIL-1005','Engineering Vehicle','EV-700','HeavyCorp',2016,'11111111-1111-1111-1111-111111111103','Marcus Reid','Out of Service'),
 ('VH-006','MIL-1006','Light Vehicle','LV-200','AutoWorks',2022,'11111111-1111-1111-1111-111111111105','Tomas Berg','Operational'),
 ('VH-007','MIL-1007','Fuel Tanker','FT-900','TruckCo',2017,'11111111-1111-1111-1111-111111111102','Hugo Silva','Reserved'),
 ('VH-008','MIL-1008','Bus','BS-50','TransBuild',2015,'11111111-1111-1111-1111-111111111101','Luis Fernandez','Operational'),
 ('VH-009','MIL-1009','Utility Truck','U-6000','TruckCo',2023,'11111111-1111-1111-1111-111111111103','Ali Rahman','Operational'),
 ('VH-010','MIL-1010','Light Vehicle','LV-150','AutoWorks',2014,'11111111-1111-1111-1111-111111111104','Ivy Chen','Maintenance');

INSERT INTO public.vehicle_maintenance (vehicle_id, maintenance_type, maintenance_date, technician, cost, description, next_maintenance_date, status)
SELECT v.id, 'Scheduled Service', DATE '2026-02-10', 'Workshop Team A', 850.00, 'Routine service and inspection.', DATE '2026-08-10',
  CASE WHEN v.status = 'Maintenance' THEN 'In Progress' ELSE 'Completed' END
FROM public.vehicles v;

INSERT INTO public.vehicle_faults (vehicle_id, fault_type, description, reported_by, report_date, priority, status)
SELECT v.id, 'Mechanical', 'Sample fault report - engine warning light.', 'Duty NCO', DATE '2026-04-01', 'High', 'Open'
FROM public.vehicles v WHERE v.status <> 'Operational';

INSERT INTO public.vehicle_locations (vehicle_id, location_name, latitude, longitude, status)
SELECT v.id, 'Motor Pool', 52.2297, 21.0122, v.status FROM public.vehicles v;

INSERT INTO public.operations (reference_number, title, unit_id, responsible_officer, start_date, end_date, status, description) VALUES
 ('OP-2026-001','Annual Logistics Review','11111111-1111-1111-1111-111111111102','Maj. Anna Weber','2026-03-01','2026-03-20','Approved','Administrative review of depot stock levels.'),
 ('OP-2026-002','Unit Training Cycle','11111111-1111-1111-1111-111111111101','Lt. Lena Ahmed','2026-04-05','2026-05-05','Pending Approval','Planned training schedule for the quarter.'),
 ('OP-2026-003','Medical Readiness Assessment','11111111-1111-1111-1111-111111111104','Lt. Grace Okafor','2026-02-10','2026-02-28','Completed','Personnel medical readiness assessment.'),
 ('OP-2026-004','Facility Maintenance Program','11111111-1111-1111-1111-111111111103','Cpt. Elena Novak','2026-06-01','2026-07-15','Draft','Engineering maintenance planning record.');

INSERT INTO public.documents (document_code, title, category, author, unit_id, classification, status) VALUES
 ('DOC-0001','Standard Operating Procedure - Stores','Procedure','Maj. Anna Weber','11111111-1111-1111-1111-111111111102','Internal','Active'),
 ('DOC-0002','Annual Personnel Report 2025','Report','Lt. Lena Ahmed','11111111-1111-1111-1111-111111111101','Confidential','Active'),
 ('DOC-0003','Vehicle Maintenance Policy','Policy','Cpt. Clara Dubois','11111111-1111-1111-1111-111111111105','Public','Active'),
 ('DOC-0004','Medical Readiness Summary','Summary','Lt. Grace Okafor','11111111-1111-1111-1111-111111111104','Restricted','Active'),
 ('DOC-0005','Engineering Inspection Checklist','Checklist','Sgt. Marcus Reid','11111111-1111-1111-1111-111111111103','Internal','Archived');

INSERT INTO public.security_reports (report_code, report_date, source, location, category, description, reliability, risk_level, status) VALUES
 ('SR-001','2026-01-12','Patrol Report','Northern Garrison','Perimeter','Sample report - unauthorised access attempt at fence line.','Reliable','Medium','Closed'),
 ('SR-002','2026-02-04','Duty Officer','Central Depot','Cyber','Sample report - phishing attempt on unit mailbox.','Probable','High','Under Review'),
 ('SR-003','2026-03-18','Local Liaison','Eastern Base','Safety','Sample report - road damage affecting convoy route.','Reliable','Low','Closed'),
 ('SR-004','2026-04-22','Duty Officer','Western Station','Physical Security','Sample report - CCTV outage in sector 3.','Possible','Critical','Open'),
 ('SR-005','2026-05-09','Patrol Report','Central Hospital','Perimeter','Sample report - unattended vehicle near facility.','Probable','Medium','Under Review');

INSERT INTO public.inventory (item_code, name, category, quantity, minimum_level, unit_of_measure, storage_location) VALUES
 ('INV-001','Combat Boots','Clothing',320,100,'pairs','Depot A'),
 ('INV-002','Field Uniform Set','Clothing',280,120,'sets','Depot A'),
 ('INV-003','Ration Pack 24h','Provisions',90,150,'packs','Depot B'),
 ('INV-004','Diesel Fuel','Fuel',12000,5000,'litres','Fuel Yard'),
 ('INV-005','Engine Oil','Fuel',0,50,'litres','Workshop'),
 ('INV-006','First Aid Refill Kit','Medical',45,40,'kits','Medical Store'),
 ('INV-007','Printer Paper A4','Office',200,50,'reams','HQ Store'),
 ('INV-008','Batteries AA','General',15,60,'packs','Depot B');

INSERT INTO public.inventory_transactions (inventory_id, transaction_type, quantity, performed_by, notes)
SELECT i.id, 'Stock In', 50, 'Sgt. Sara Lindqvist', 'Sample opening stock movement.' FROM public.inventory i;

INSERT INTO public.notifications (title, message, type, module) VALUES
 ('Low stock alert','Ration Pack 24h is below minimum level.','warning','Inventory'),
 ('Out of stock','Engine Oil is out of stock.','error','Inventory'),
 ('Maintenance due','Vehicle MIL-1002 maintenance is in progress.','info','Vehicles'),
 ('Pending approval','Operation OP-2026-002 awaits approval.','info','Operations'),
 ('New security report','SR-004 recorded as Critical risk.','warning','Intelligence');

INSERT INTO public.locations (name, category, latitude, longitude, description, classification) VALUES
 ('Northern Garrison','Unit',52.2297,21.0122,'Administrative location of 1st Infantry Battalion.','Internal'),
 ('Central Depot','Facility',51.1079,17.0385,'Main logistics depot.','Internal'),
 ('Eastern Base','Unit',50.0647,19.9450,'Engineering company base.','Internal'),
 ('Central Hospital','Facility',54.3520,18.6466,'Medical support facility.','Public'),
 ('Western Station','Unit',53.4285,14.5528,'Signals company station.','Internal');

INSERT INTO public.system_settings (key, value) VALUES
 ('organization_name','Military Management System'),
 ('contact_email','hq@example.mil'),
 ('timezone','UTC'),
 ('language','English');

INSERT INTO public.audit_logs (user_name, action, module, record_ref, description, ip_address) VALUES
 ('System','Seeded','System','sample-data','Sample demonstration data loaded.','127.0.0.1');
