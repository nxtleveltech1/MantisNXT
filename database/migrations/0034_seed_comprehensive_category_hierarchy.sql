-- Migration: Seed Comprehensive Category Hierarchy
-- Description: Seeds 5-level category hierarchy from Categories_Hierachy.md
-- Generated: 2025-11-23T20:19:37.044Z

BEGIN;

-- Helper function to get category ID by path
CREATE OR REPLACE FUNCTION get_category_id_by_path(category_path TEXT)
RETURNS UUID AS $$
DECLARE
  cat_id UUID;
BEGIN
  SELECT category_id INTO cat_id
  FROM core.category
  WHERE path = category_path
  LIMIT 1;
  RETURN cat_id;
END;
$$ LANGUAGE plpgsql;

-- Level 1 Categories (10 categories)
INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Musical Instruments',
  NULL::uuid,
  1,
  '/musical-instruments',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Studio, Recording & Production',
  NULL::uuid,
  1,
  '/studio-recording--production',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Live Sound & PA',
  NULL::uuid,
  1,
  '/live-sound--pa',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DJ & Electronic Music',
  NULL::uuid,
  1,
  '/dj--electronic-music',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Lighting, Stage & Effects',
  NULL::uuid,
  1,
  '/lighting-stage--effects',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Installed AV, Conferencing & Video',
  NULL::uuid,
  1,
  '/installed-av-conferencing--video',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Consumer Audio, Hi-Fi & Portable',
  NULL::uuid,
  1,
  '/consumer-audio-hi-fi--portable',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Cables, Connectors & Power',
  NULL::uuid,
  1,
  '/cables-connectors--power',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Accessories, Cases, Racks & Stands',
  NULL::uuid,
  1,
  '/accessories-cases-racks--stands',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Spares, Components & Consumables',
  NULL::uuid,
  1,
  '/spares-components--consumables',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

-- Level 2 Categories (52 categories)
INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Guitars & Basses',
  get_category_id_by_path('/musical-instruments')::uuid,
  2,
  '/musical-instruments/guitars--basses',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Amps & Guitar Electronics',
  get_category_id_by_path('/musical-instruments')::uuid,
  2,
  '/musical-instruments/amps--guitar-electronics',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Drums & Percussion',
  get_category_id_by_path('/musical-instruments')::uuid,
  2,
  '/musical-instruments/drums--percussion',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Keyboards & Pianos',
  get_category_id_by_path('/musical-instruments')::uuid,
  2,
  '/musical-instruments/keyboards--pianos',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Orchestral, Band & Folk',
  get_category_id_by_path('/musical-instruments')::uuid,
  2,
  '/musical-instruments/orchestral-band--folk',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Audio Interfaces & Converters',
  get_category_id_by_path('/studio-recording--production')::uuid,
  2,
  '/studio-recording--production/audio-interfaces--converters',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Studio Monitors & Headphones',
  get_category_id_by_path('/studio-recording--production')::uuid,
  2,
  '/studio-recording--production/studio-monitors--headphones',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Microphones (Studio)',
  get_category_id_by_path('/studio-recording--production')::uuid,
  2,
  '/studio-recording--production/microphones-studio',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Outboard & Signal Processing',
  get_category_id_by_path('/studio-recording--production')::uuid,
  2,
  '/studio-recording--production/outboard--signal-processing',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Recording Tools & Controllers',
  get_category_id_by_path('/studio-recording--production')::uuid,
  2,
  '/studio-recording--production/recording-tools--controllers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Studio Furniture & Acoustic Treatment',
  get_category_id_by_path('/studio-recording--production')::uuid,
  2,
  '/studio-recording--production/studio-furniture--acoustic-treatment',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'PA Systems & Loudspeakers',
  get_category_id_by_path('/live-sound--pa')::uuid,
  2,
  '/live-sound--pa/pa-systems--loudspeakers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Mixing Consoles',
  get_category_id_by_path('/live-sound--pa')::uuid,
  2,
  '/live-sound--pa/mixing-consoles',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Microphones (Live)',
  get_category_id_by_path('/live-sound--pa')::uuid,
  2,
  '/live-sound--pa/microphones-live',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Wireless Systems',
  get_category_id_by_path('/live-sound--pa')::uuid,
  2,
  '/live-sound--pa/wireless-systems',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Signal Processing & System Management',
  get_category_id_by_path('/live-sound--pa')::uuid,
  2,
  '/live-sound--pa/signal-processing--system-management',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Public Address & 100V Line',
  get_category_id_by_path('/live-sound--pa')::uuid,
  2,
  '/live-sound--pa/public-address--100v-line',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Live Sound Accessories',
  get_category_id_by_path('/live-sound--pa')::uuid,
  2,
  '/live-sound--pa/live-sound-accessories',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DJ Players & Controllers',
  get_category_id_by_path('/dj--electronic-music')::uuid,
  2,
  '/dj--electronic-music/dj-players--controllers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DJ Mixers',
  get_category_id_by_path('/dj--electronic-music')::uuid,
  2,
  '/dj--electronic-music/dj-mixers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Turntables & Cartridges',
  get_category_id_by_path('/dj--electronic-music')::uuid,
  2,
  '/dj--electronic-music/turntables--cartridges',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DJ Monitoring & PA',
  get_category_id_by_path('/dj--electronic-music')::uuid,
  2,
  '/dj--electronic-music/dj-monitoring--pa',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DJ Effects & Accessories',
  get_category_id_by_path('/dj--electronic-music')::uuid,
  2,
  '/dj--electronic-music/dj-effects--accessories',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Entertainment Lighting Fixtures',
  get_category_id_by_path('/lighting-stage--effects')::uuid,
  2,
  '/lighting-stage--effects/entertainment-lighting-fixtures',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Architectural & Install Lighting',
  get_category_id_by_path('/lighting-stage--effects')::uuid,
  2,
  '/lighting-stage--effects/architectural--install-lighting',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Control & Dimming',
  get_category_id_by_path('/lighting-stage--effects')::uuid,
  2,
  '/lighting-stage--effects/control--dimming',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Effects Machines',
  get_category_id_by_path('/lighting-stage--effects')::uuid,
  2,
  '/lighting-stage--effects/effects-machines',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Truss, Staging & Rigging',
  get_category_id_by_path('/lighting-stage--effects')::uuid,
  2,
  '/lighting-stage--effects/truss-staging--rigging',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Stands & Support',
  get_category_id_by_path('/lighting-stage--effects')::uuid,
  2,
  '/lighting-stage--effects/stands--support',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Projectors & Screens',
  get_category_id_by_path('/installed-av-conferencing--video')::uuid,
  2,
  '/installed-av-conferencing--video/projectors--screens',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Displays & Mounting',
  get_category_id_by_path('/installed-av-conferencing--video')::uuid,
  2,
  '/installed-av-conferencing--video/displays--mounting',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Conferencing & Collaboration',
  get_category_id_by_path('/installed-av-conferencing--video')::uuid,
  2,
  '/installed-av-conferencing--video/conferencing--collaboration',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Signal Management & Distribution',
  get_category_id_by_path('/installed-av-conferencing--video')::uuid,
  2,
  '/installed-av-conferencing--video/signal-management--distribution',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Installed Audio',
  get_category_id_by_path('/installed-av-conferencing--video')::uuid,
  2,
  '/installed-av-conferencing--video/installed-audio',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Home Hi-Fi Components',
  get_category_id_by_path('/consumer-audio-hi-fi--portable')::uuid,
  2,
  '/consumer-audio-hi-fi--portable/home-hi-fi-components',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Speaker Systems',
  get_category_id_by_path('/consumer-audio-hi-fi--portable')::uuid,
  2,
  '/consumer-audio-hi-fi--portable/speaker-systems',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Headphones & Earphones (Consumer)',
  get_category_id_by_path('/consumer-audio-hi-fi--portable')::uuid,
  2,
  '/consumer-audio-hi-fi--portable/headphones--earphones-consumer',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Portable & Bluetooth Speakers',
  get_category_id_by_path('/consumer-audio-hi-fi--portable')::uuid,
  2,
  '/consumer-audio-hi-fi--portable/portable--bluetooth-speakers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Personal Audio & Accessories',
  get_category_id_by_path('/consumer-audio-hi-fi--portable')::uuid,
  2,
  '/consumer-audio-hi-fi--portable/personal-audio--accessories',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Audio Cables',
  get_category_id_by_path('/cables-connectors--power')::uuid,
  2,
  '/cables-connectors--power/audio-cables',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Data & Digital Cables',
  get_category_id_by_path('/cables-connectors--power')::uuid,
  2,
  '/cables-connectors--power/data--digital-cables',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Video & AV Cables',
  get_category_id_by_path('/cables-connectors--power')::uuid,
  2,
  '/cables-connectors--power/video--av-cables',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Power Cables & Distribution',
  get_category_id_by_path('/cables-connectors--power')::uuid,
  2,
  '/cables-connectors--power/power-cables--distribution',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Connectors & Bulk Cable',
  get_category_id_by_path('/cables-connectors--power')::uuid,
  2,
  '/cables-connectors--power/connectors--bulk-cable',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Instrument Accessories',
  get_category_id_by_path('/accessories-cases-racks--stands')::uuid,
  2,
  '/accessories-cases-racks--stands/instrument-accessories',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Cases & Bags',
  get_category_id_by_path('/accessories-cases-racks--stands')::uuid,
  2,
  '/accessories-cases-racks--stands/cases--bags',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Racks & Rack Accessories',
  get_category_id_by_path('/accessories-cases-racks--stands')::uuid,
  2,
  '/accessories-cases-racks--stands/racks--rack-accessories',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Stands & Mounts (General)',
  get_category_id_by_path('/accessories-cases-racks--stands')::uuid,
  2,
  '/accessories-cases-racks--stands/stands--mounts-general',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Electronic Spares',
  get_category_id_by_path('/spares-components--consumables')::uuid,
  2,
  '/spares-components--consumables/electronic-spares',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Instrument Spares',
  get_category_id_by_path('/spares-components--consumables')::uuid,
  2,
  '/spares-components--consumables/instrument-spares',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Lighting & Rigging Spares',
  get_category_id_by_path('/spares-components--consumables')::uuid,
  2,
  '/spares-components--consumables/lighting--rigging-spares',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Maintenance & Care',
  get_category_id_by_path('/spares-components--consumables')::uuid,
  2,
  '/spares-components--consumables/maintenance--care',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

-- Level 3 Categories (183 categories)
INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Electric Guitars',
  get_category_id_by_path('/musical-instruments/guitars--basses')::uuid,
  3,
  '/musical-instruments/guitars--basses/electric-guitars',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Acoustic & Electro-Acoustic Guitars',
  get_category_id_by_path('/musical-instruments/guitars--basses')::uuid,
  3,
  '/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Basses',
  get_category_id_by_path('/musical-instruments/guitars--basses')::uuid,
  3,
  '/musical-instruments/guitars--basses/basses',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Guitar & Bass Packs',
  get_category_id_by_path('/musical-instruments/guitars--basses')::uuid,
  3,
  '/musical-instruments/guitars--basses/guitar--bass-packs',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Guitar Amplifiers',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics')::uuid,
  3,
  '/musical-instruments/amps--guitar-electronics/guitar-amplifiers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Bass Amplifiers',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics')::uuid,
  3,
  '/musical-instruments/amps--guitar-electronics/bass-amplifiers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Pedals & Multi-FX',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics')::uuid,
  3,
  '/musical-instruments/amps--guitar-electronics/pedals--multi-fx',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Acoustic Drums',
  get_category_id_by_path('/musical-instruments/drums--percussion')::uuid,
  3,
  '/musical-instruments/drums--percussion/acoustic-drums',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Cymbals',
  get_category_id_by_path('/musical-instruments/drums--percussion')::uuid,
  3,
  '/musical-instruments/drums--percussion/cymbals',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Electronic Drums',
  get_category_id_by_path('/musical-instruments/drums--percussion')::uuid,
  3,
  '/musical-instruments/drums--percussion/electronic-drums',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Percussion',
  get_category_id_by_path('/musical-instruments/drums--percussion')::uuid,
  3,
  '/musical-instruments/drums--percussion/percussion',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Drum Hardware & Accessories',
  get_category_id_by_path('/musical-instruments/drums--percussion')::uuid,
  3,
  '/musical-instruments/drums--percussion/drum-hardware--accessories',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Digital Pianos',
  get_category_id_by_path('/musical-instruments/keyboards--pianos')::uuid,
  3,
  '/musical-instruments/keyboards--pianos/digital-pianos',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Synthesizers & Workstations',
  get_category_id_by_path('/musical-instruments/keyboards--pianos')::uuid,
  3,
  '/musical-instruments/keyboards--pianos/synthesizers--workstations',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Portable Keyboards & Arrangers',
  get_category_id_by_path('/musical-instruments/keyboards--pianos')::uuid,
  3,
  '/musical-instruments/keyboards--pianos/portable-keyboards--arrangers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'MIDI Controllers & Pad Controllers',
  get_category_id_by_path('/musical-instruments/keyboards--pianos')::uuid,
  3,
  '/musical-instruments/keyboards--pianos/midi-controllers--pad-controllers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Keyboard Accessories',
  get_category_id_by_path('/musical-instruments/keyboards--pianos')::uuid,
  3,
  '/musical-instruments/keyboards--pianos/keyboard-accessories',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Orchestral Strings (Violin/Viola/Cello/Double Bass)',
  get_category_id_by_path('/musical-instruments/orchestral-band--folk')::uuid,
  3,
  '/musical-instruments/orchestral-band--folk/orchestral-strings-violinviolacellodouble-bass',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Brass & Woodwind',
  get_category_id_by_path('/musical-instruments/orchestral-band--folk')::uuid,
  3,
  '/musical-instruments/orchestral-band--folk/brass--woodwind',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Folk & Traditional (Ukulele, Mandolin, Banjo, etc.)',
  get_category_id_by_path('/musical-instruments/orchestral-band--folk')::uuid,
  3,
  '/musical-instruments/orchestral-band--folk/folk--traditional-ukulele-mandolin-banjo-etc',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Educational Packs & Classroom Instruments',
  get_category_id_by_path('/musical-instruments/orchestral-band--folk')::uuid,
  3,
  '/musical-instruments/orchestral-band--folk/educational-packs--classroom-instruments',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Desktop Interfaces',
  get_category_id_by_path('/studio-recording--production/audio-interfaces--converters')::uuid,
  3,
  '/studio-recording--production/audio-interfaces--converters/desktop-interfaces',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Rackmount Interfaces',
  get_category_id_by_path('/studio-recording--production/audio-interfaces--converters')::uuid,
  3,
  '/studio-recording--production/audio-interfaces--converters/rackmount-interfaces',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Digital Converters & Clocks',
  get_category_id_by_path('/studio-recording--production/audio-interfaces--converters')::uuid,
  3,
  '/studio-recording--production/audio-interfaces--converters/digital-converters--clocks',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Nearfield & Midfield Monitors',
  get_category_id_by_path('/studio-recording--production/studio-monitors--headphones')::uuid,
  3,
  '/studio-recording--production/studio-monitors--headphones/nearfield--midfield-monitors',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Subwoofers',
  get_category_id_by_path('/studio-recording--production/studio-monitors--headphones')::uuid,
  3,
  '/studio-recording--production/studio-monitors--headphones/subwoofers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Studio Headphones',
  get_category_id_by_path('/studio-recording--production/studio-monitors--headphones')::uuid,
  3,
  '/studio-recording--production/studio-monitors--headphones/studio-headphones',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'In-Ear Monitoring (Studio & Stage)',
  get_category_id_by_path('/studio-recording--production/studio-monitors--headphones')::uuid,
  3,
  '/studio-recording--production/studio-monitors--headphones/in-ear-monitoring-studio--stage',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Condenser Mics',
  get_category_id_by_path('/studio-recording--production/microphones-studio')::uuid,
  3,
  '/studio-recording--production/microphones-studio/condenser-mics',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Dynamic Mics',
  get_category_id_by_path('/studio-recording--production/microphones-studio')::uuid,
  3,
  '/studio-recording--production/microphones-studio/dynamic-mics',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Ribbon Mics',
  get_category_id_by_path('/studio-recording--production/microphones-studio')::uuid,
  3,
  '/studio-recording--production/microphones-studio/ribbon-mics',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'USB & Podcast Mics',
  get_category_id_by_path('/studio-recording--production/microphones-studio')::uuid,
  3,
  '/studio-recording--production/microphones-studio/usb--podcast-mics',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Mic Packs & Bundles',
  get_category_id_by_path('/studio-recording--production/microphones-studio')::uuid,
  3,
  '/studio-recording--production/microphones-studio/mic-packs--bundles',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Preamps & Channel Strips',
  get_category_id_by_path('/studio-recording--production/outboard--signal-processing')::uuid,
  3,
  '/studio-recording--production/outboard--signal-processing/preamps--channel-strips',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Compressors & Limiters',
  get_category_id_by_path('/studio-recording--production/outboard--signal-processing')::uuid,
  3,
  '/studio-recording--production/outboard--signal-processing/compressors--limiters',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'EQ & Filters',
  get_category_id_by_path('/studio-recording--production/outboard--signal-processing')::uuid,
  3,
  '/studio-recording--production/outboard--signal-processing/eq--filters',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Multi-FX & Reverb Units',
  get_category_id_by_path('/studio-recording--production/outboard--signal-processing')::uuid,
  3,
  '/studio-recording--production/outboard--signal-processing/multi-fx--reverb-units',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Monitor Controllers & Headphone Amps',
  get_category_id_by_path('/studio-recording--production/outboard--signal-processing')::uuid,
  3,
  '/studio-recording--production/outboard--signal-processing/monitor-controllers--headphone-amps',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DAW Controllers & Control Surfaces',
  get_category_id_by_path('/studio-recording--production/recording-tools--controllers')::uuid,
  3,
  '/studio-recording--production/recording-tools--controllers/daw-controllers--control-surfaces',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'MIDI Keyboards & Pad Controllers (Studio)',
  get_category_id_by_path('/studio-recording--production/recording-tools--controllers')::uuid,
  3,
  '/studio-recording--production/recording-tools--controllers/midi-keyboards--pad-controllers-studio',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Studio Computers / Audio PCs (if applicable)',
  get_category_id_by_path('/studio-recording--production/recording-tools--controllers')::uuid,
  3,
  '/studio-recording--production/recording-tools--controllers/studio-computers--audio-pcs-if-applicable',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Studio Desks & Racks',
  get_category_id_by_path('/studio-recording--production/studio-furniture--acoustic-treatment')::uuid,
  3,
  '/studio-recording--production/studio-furniture--acoustic-treatment/studio-desks--racks',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Monitor Stands',
  get_category_id_by_path('/studio-recording--production/studio-furniture--acoustic-treatment')::uuid,
  3,
  '/studio-recording--production/studio-furniture--acoustic-treatment/monitor-stands',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Acoustic Panels & Bass Traps',
  get_category_id_by_path('/studio-recording--production/studio-furniture--acoustic-treatment')::uuid,
  3,
  '/studio-recording--production/studio-furniture--acoustic-treatment/acoustic-panels--bass-traps',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Vocal Booths & Reflection Filters',
  get_category_id_by_path('/studio-recording--production/studio-furniture--acoustic-treatment')::uuid,
  3,
  '/studio-recording--production/studio-furniture--acoustic-treatment/vocal-booths--reflection-filters',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Portable PA Systems',
  get_category_id_by_path('/live-sound--pa/pa-systems--loudspeakers')::uuid,
  3,
  '/live-sound--pa/pa-systems--loudspeakers/portable-pa-systems',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Full-Range Speakers',
  get_category_id_by_path('/live-sound--pa/pa-systems--loudspeakers')::uuid,
  3,
  '/live-sound--pa/pa-systems--loudspeakers/full-range-speakers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Subwoofers',
  get_category_id_by_path('/live-sound--pa/pa-systems--loudspeakers')::uuid,
  3,
  '/live-sound--pa/pa-systems--loudspeakers/subwoofers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Installed Speakers (Ceiling, Wall, Column, Horn)',
  get_category_id_by_path('/live-sound--pa/pa-systems--loudspeakers')::uuid,
  3,
  '/live-sound--pa/pa-systems--loudspeakers/installed-speakers-ceiling-wall-column-horn',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Analog Mixers',
  get_category_id_by_path('/live-sound--pa/mixing-consoles')::uuid,
  3,
  '/live-sound--pa/mixing-consoles/analog-mixers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Digital Mixers',
  get_category_id_by_path('/live-sound--pa/mixing-consoles')::uuid,
  3,
  '/live-sound--pa/mixing-consoles/digital-mixers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Powered Mixers',
  get_category_id_by_path('/live-sound--pa/mixing-consoles')::uuid,
  3,
  '/live-sound--pa/mixing-consoles/powered-mixers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Vocal & Instrument Dynamics',
  get_category_id_by_path('/live-sound--pa/microphones-live')::uuid,
  3,
  '/live-sound--pa/microphones-live/vocal--instrument-dynamics',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Drum & Instrument Mic Packs',
  get_category_id_by_path('/live-sound--pa/microphones-live')::uuid,
  3,
  '/live-sound--pa/microphones-live/drum--instrument-mic-packs',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Installed & Paging Mics (Gooseneck, Boundary)',
  get_category_id_by_path('/live-sound--pa/microphones-live')::uuid,
  3,
  '/live-sound--pa/microphones-live/installed--paging-mics-gooseneck-boundary',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Handheld Systems',
  get_category_id_by_path('/live-sound--pa/wireless-systems')::uuid,
  3,
  '/live-sound--pa/wireless-systems/handheld-systems',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Lavalier & Headset Systems',
  get_category_id_by_path('/live-sound--pa/wireless-systems')::uuid,
  3,
  '/live-sound--pa/wireless-systems/lavalier--headset-systems',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Instrument Wireless',
  get_category_id_by_path('/live-sound--pa/wireless-systems')::uuid,
  3,
  '/live-sound--pa/wireless-systems/instrument-wireless',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'In-Ear Monitor Systems',
  get_category_id_by_path('/live-sound--pa/wireless-systems')::uuid,
  3,
  '/live-sound--pa/wireless-systems/in-ear-monitor-systems',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Antenna Distribution & Accessories',
  get_category_id_by_path('/live-sound--pa/wireless-systems')::uuid,
  3,
  '/live-sound--pa/wireless-systems/antenna-distribution--accessories',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'PA Controllers & DSP',
  get_category_id_by_path('/live-sound--pa/signal-processing--system-management')::uuid,
  3,
  '/live-sound--pa/signal-processing--system-management/pa-controllers--dsp',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Graphic & Parametric EQ',
  get_category_id_by_path('/live-sound--pa/signal-processing--system-management')::uuid,
  3,
  '/live-sound--pa/signal-processing--system-management/graphic--parametric-eq',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Crossovers',
  get_category_id_by_path('/live-sound--pa/signal-processing--system-management')::uuid,
  3,
  '/live-sound--pa/signal-processing--system-management/crossovers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Feedback Suppressors & Auto Mixers',
  get_category_id_by_path('/live-sound--pa/signal-processing--system-management')::uuid,
  3,
  '/live-sound--pa/signal-processing--system-management/feedback-suppressors--auto-mixers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Paging Amplifiers & Mixers',
  get_category_id_by_path('/live-sound--pa/public-address--100v-line')::uuid,
  3,
  '/live-sound--pa/public-address--100v-line/paging-amplifiers--mixers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  '100V Speakers (Ceiling, Wall, Horn, Column)',
  get_category_id_by_path('/live-sound--pa/public-address--100v-line')::uuid,
  3,
  '/live-sound--pa/public-address--100v-line/100v-speakers-ceiling-wall-horn-column',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Zone Mixers & Routers',
  get_category_id_by_path('/live-sound--pa/public-address--100v-line')::uuid,
  3,
  '/live-sound--pa/public-address--100v-line/zone-mixers--routers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Evac & Voice Alarm (if applicable)',
  get_category_id_by_path('/live-sound--pa/public-address--100v-line')::uuid,
  3,
  '/live-sound--pa/public-address--100v-line/evac--voice-alarm-if-applicable',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Speaker Stands & Poles',
  get_category_id_by_path('/live-sound--pa/live-sound-accessories')::uuid,
  3,
  '/live-sound--pa/live-sound-accessories/speaker-stands--poles',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Mic Stands & Clips',
  get_category_id_by_path('/live-sound--pa/live-sound-accessories')::uuid,
  3,
  '/live-sound--pa/live-sound-accessories/mic-stands--clips',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Flight Cases & Bags (Speakers, Mixers, Racks)',
  get_category_id_by_path('/live-sound--pa/live-sound-accessories')::uuid,
  3,
  '/live-sound--pa/live-sound-accessories/flight-cases--bags-speakers-mixers-racks',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DI Boxes',
  get_category_id_by_path('/live-sound--pa/live-sound-accessories')::uuid,
  3,
  '/live-sound--pa/live-sound-accessories/di-boxes',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Stage Snakes & Multicores',
  get_category_id_by_path('/live-sound--pa/live-sound-accessories')::uuid,
  3,
  '/live-sound--pa/live-sound-accessories/stage-snakes--multicores',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Media Players (Standalone)',
  get_category_id_by_path('/dj--electronic-music/dj-players--controllers')::uuid,
  3,
  '/dj--electronic-music/dj-players--controllers/media-players-standalone',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DJ Controllers (Laptop/Software)',
  get_category_id_by_path('/dj--electronic-music/dj-players--controllers')::uuid,
  3,
  '/dj--electronic-music/dj-players--controllers/dj-controllers-laptopsoftware',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'All-in-One DJ Systems',
  get_category_id_by_path('/dj--electronic-music/dj-players--controllers')::uuid,
  3,
  '/dj--electronic-music/dj-players--controllers/all-in-one-dj-systems',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  '2-Channel Mixers',
  get_category_id_by_path('/dj--electronic-music/dj-mixers')::uuid,
  3,
  '/dj--electronic-music/dj-mixers/2-channel-mixers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  '4-Channel & Club Mixers',
  get_category_id_by_path('/dj--electronic-music/dj-mixers')::uuid,
  3,
  '/dj--electronic-music/dj-mixers/4-channel--club-mixers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Scratch / Battle Mixers',
  get_category_id_by_path('/dj--electronic-music/dj-mixers')::uuid,
  3,
  '/dj--electronic-music/dj-mixers/scratch--battle-mixers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DJ Turntables',
  get_category_id_by_path('/dj--electronic-music/turntables--cartridges')::uuid,
  3,
  '/dj--electronic-music/turntables--cartridges/dj-turntables',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Hi-Fi Turntables',
  get_category_id_by_path('/dj--electronic-music/turntables--cartridges')::uuid,
  3,
  '/dj--electronic-music/turntables--cartridges/hi-fi-turntables',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Cartridges & Styli',
  get_category_id_by_path('/dj--electronic-music/turntables--cartridges')::uuid,
  3,
  '/dj--electronic-music/turntables--cartridges/cartridges--styli',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DJ Headphones',
  get_category_id_by_path('/dj--electronic-music/dj-monitoring--pa')::uuid,
  3,
  '/dj--electronic-music/dj-monitoring--pa/dj-headphones',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Booth Monitors',
  get_category_id_by_path('/dj--electronic-music/dj-monitoring--pa')::uuid,
  3,
  '/dj--electronic-music/dj-monitoring--pa/booth-monitors',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Compact DJ PA Systems',
  get_category_id_by_path('/dj--electronic-music/dj-monitoring--pa')::uuid,
  3,
  '/dj--electronic-music/dj-monitoring--pa/compact-dj-pa-systems',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'FX Units & Samplers',
  get_category_id_by_path('/dj--electronic-music/dj-effects--accessories')::uuid,
  3,
  '/dj--electronic-music/dj-effects--accessories/fx-units--samplers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Laptop Stands',
  get_category_id_by_path('/dj--electronic-music/dj-effects--accessories')::uuid,
  3,
  '/dj--electronic-music/dj-effects--accessories/laptop-stands',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Controller Cases & Bags',
  get_category_id_by_path('/dj--electronic-music/dj-effects--accessories')::uuid,
  3,
  '/dj--electronic-music/dj-effects--accessories/controller-cases--bags',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Slipmats, Faders, Spare Parts',
  get_category_id_by_path('/dj--electronic-music/dj-effects--accessories')::uuid,
  3,
  '/dj--electronic-music/dj-effects--accessories/slipmats-faders-spare-parts',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'PAR & Wash Lights',
  get_category_id_by_path('/lighting-stage--effects/entertainment-lighting-fixtures')::uuid,
  3,
  '/lighting-stage--effects/entertainment-lighting-fixtures/par--wash-lights',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Spot & Profile Fixtures',
  get_category_id_by_path('/lighting-stage--effects/entertainment-lighting-fixtures')::uuid,
  3,
  '/lighting-stage--effects/entertainment-lighting-fixtures/spot--profile-fixtures',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Moving Heads (Spot/Wash/Beam/Hybrid)',
  get_category_id_by_path('/lighting-stage--effects/entertainment-lighting-fixtures')::uuid,
  3,
  '/lighting-stage--effects/entertainment-lighting-fixtures/moving-heads-spotwashbeamhybrid',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'LED Bars & Strip Fixtures',
  get_category_id_by_path('/lighting-stage--effects/entertainment-lighting-fixtures')::uuid,
  3,
  '/lighting-stage--effects/entertainment-lighting-fixtures/led-bars--strip-fixtures',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'UV, Strobe & Blacklight',
  get_category_id_by_path('/lighting-stage--effects/entertainment-lighting-fixtures')::uuid,
  3,
  '/lighting-stage--effects/entertainment-lighting-fixtures/uv-strobe--blacklight',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'LED Fixtures (Indoor/Outdoor)',
  get_category_id_by_path('/lighting-stage--effects/architectural--install-lighting')::uuid,
  3,
  '/lighting-stage--effects/architectural--install-lighting/led-fixtures-indooroutdoor',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Wall Washers & Linear Fixtures',
  get_category_id_by_path('/lighting-stage--effects/architectural--install-lighting')::uuid,
  3,
  '/lighting-stage--effects/architectural--install-lighting/wall-washers--linear-fixtures',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Downlights & Accent Fixtures',
  get_category_id_by_path('/lighting-stage--effects/architectural--install-lighting')::uuid,
  3,
  '/lighting-stage--effects/architectural--install-lighting/downlights--accent-fixtures',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DMX Controllers & Consoles',
  get_category_id_by_path('/lighting-stage--effects/control--dimming')::uuid,
  3,
  '/lighting-stage--effects/control--dimming/dmx-controllers--consoles',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DMX Splitters, Nodes & Interfaces',
  get_category_id_by_path('/lighting-stage--effects/control--dimming')::uuid,
  3,
  '/lighting-stage--effects/control--dimming/dmx-splitters-nodes--interfaces',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Dimmers & Relay Packs',
  get_category_id_by_path('/lighting-stage--effects/control--dimming')::uuid,
  3,
  '/lighting-stage--effects/control--dimming/dimmers--relay-packs',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Fog & Smoke Machines',
  get_category_id_by_path('/lighting-stage--effects/effects-machines')::uuid,
  3,
  '/lighting-stage--effects/effects-machines/fog--smoke-machines',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Haze Machines',
  get_category_id_by_path('/lighting-stage--effects/effects-machines')::uuid,
  3,
  '/lighting-stage--effects/effects-machines/haze-machines',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Bubble & Snow Machines',
  get_category_id_by_path('/lighting-stage--effects/effects-machines')::uuid,
  3,
  '/lighting-stage--effects/effects-machines/bubble--snow-machines',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Fluids & Consumables',
  get_category_id_by_path('/lighting-stage--effects/effects-machines')::uuid,
  3,
  '/lighting-stage--effects/effects-machines/fluids--consumables',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Truss (Box, Ladder, etc.)',
  get_category_id_by_path('/lighting-stage--effects/truss-staging--rigging')::uuid,
  3,
  '/lighting-stage--effects/truss-staging--rigging/truss-box-ladder-etc',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Stage Platforms & Risers',
  get_category_id_by_path('/lighting-stage--effects/truss-staging--rigging')::uuid,
  3,
  '/lighting-stage--effects/truss-staging--rigging/stage-platforms--risers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Lifting Systems (Wind-Ups, Cranks, Hoists)',
  get_category_id_by_path('/lighting-stage--effects/truss-staging--rigging')::uuid,
  3,
  '/lighting-stage--effects/truss-staging--rigging/lifting-systems-wind-ups-cranks-hoists',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Clamps, Couplers & Rigging Hardware',
  get_category_id_by_path('/lighting-stage--effects/truss-staging--rigging')::uuid,
  3,
  '/lighting-stage--effects/truss-staging--rigging/clamps-couplers--rigging-hardware',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Lighting Stands & T-Bars',
  get_category_id_by_path('/lighting-stage--effects/stands--support')::uuid,
  3,
  '/lighting-stage--effects/stands--support/lighting-stands--t-bars',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Speaker Stands',
  get_category_id_by_path('/lighting-stage--effects/stands--support')::uuid,
  3,
  '/lighting-stage--effects/stands--support/speaker-stands',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'TV & Screen Mounts / Brackets',
  get_category_id_by_path('/lighting-stage--effects/stands--support')::uuid,
  3,
  '/lighting-stage--effects/stands--support/tv--screen-mounts--brackets',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Projectors (Business, Education, Cinema)',
  get_category_id_by_path('/installed-av-conferencing--video/projectors--screens')::uuid,
  3,
  '/installed-av-conferencing--video/projectors--screens/projectors-business-education-cinema',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Projection Screens',
  get_category_id_by_path('/installed-av-conferencing--video/projectors--screens')::uuid,
  3,
  '/installed-av-conferencing--video/projectors--screens/projection-screens',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Professional & Commercial Displays',
  get_category_id_by_path('/installed-av-conferencing--video/displays--mounting')::uuid,
  3,
  '/installed-av-conferencing--video/displays--mounting/professional--commercial-displays',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Video Walls & LED Panels',
  get_category_id_by_path('/installed-av-conferencing--video/displays--mounting')::uuid,
  3,
  '/installed-av-conferencing--video/displays--mounting/video-walls--led-panels',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'TV & Display Mounts',
  get_category_id_by_path('/installed-av-conferencing--video/displays--mounting')::uuid,
  3,
  '/installed-av-conferencing--video/displays--mounting/tv--display-mounts',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Conference Microphones & Boundary Mics',
  get_category_id_by_path('/installed-av-conferencing--video/conferencing--collaboration')::uuid,
  3,
  '/installed-av-conferencing--video/conferencing--collaboration/conference-microphones--boundary-mics',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'USB & Network Conferencing Bars',
  get_category_id_by_path('/installed-av-conferencing--video/conferencing--collaboration')::uuid,
  3,
  '/installed-av-conferencing--video/conferencing--collaboration/usb--network-conferencing-bars',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Speakerphones & Meeting Room Systems',
  get_category_id_by_path('/installed-av-conferencing--video/conferencing--collaboration')::uuid,
  3,
  '/installed-av-conferencing--video/conferencing--collaboration/speakerphones--meeting-room-systems',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Lecture Capture & Streaming Devices',
  get_category_id_by_path('/installed-av-conferencing--video/conferencing--collaboration')::uuid,
  3,
  '/installed-av-conferencing--video/conferencing--collaboration/lecture-capture--streaming-devices',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Switchers & Matrix Switchers (HDMI/SDI/AVoIP)',
  get_category_id_by_path('/installed-av-conferencing--video/signal-management--distribution')::uuid,
  3,
  '/installed-av-conferencing--video/signal-management--distribution/switchers--matrix-switchers-hdmisdiavoip',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Extenders & Splitters',
  get_category_id_by_path('/installed-av-conferencing--video/signal-management--distribution')::uuid,
  3,
  '/installed-av-conferencing--video/signal-management--distribution/extenders--splitters',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Scalers & Converters',
  get_category_id_by_path('/installed-av-conferencing--video/signal-management--distribution')::uuid,
  3,
  '/installed-av-conferencing--video/signal-management--distribution/scalers--converters',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Control Systems & Touch Panels',
  get_category_id_by_path('/installed-av-conferencing--video/signal-management--distribution')::uuid,
  3,
  '/installed-av-conferencing--video/signal-management--distribution/control-systems--touch-panels',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Ceiling Speakers',
  get_category_id_by_path('/installed-av-conferencing--video/installed-audio')::uuid,
  3,
  '/installed-av-conferencing--video/installed-audio/ceiling-speakers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Wall Speakers',
  get_category_id_by_path('/installed-av-conferencing--video/installed-audio')::uuid,
  3,
  '/installed-av-conferencing--video/installed-audio/wall-speakers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Column & Line Array Install Speakers',
  get_category_id_by_path('/installed-av-conferencing--video/installed-audio')::uuid,
  3,
  '/installed-av-conferencing--video/installed-audio/column--line-array-install-speakers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Installed Amplifiers & DSP',
  get_category_id_by_path('/installed-av-conferencing--video/installed-audio')::uuid,
  3,
  '/installed-av-conferencing--video/installed-audio/installed-amplifiers--dsp',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Amplifiers & Receivers',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/home-hi-fi-components')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/home-hi-fi-components/amplifiers--receivers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'CD / Media Players',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/home-hi-fi-components')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/home-hi-fi-components/cd--media-players',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Tuners & Network Streamers',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/home-hi-fi-components')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/home-hi-fi-components/tuners--network-streamers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Stereo Speakers',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/speaker-systems')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/speaker-systems/stereo-speakers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Home Theatre Systems & Soundbars',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/speaker-systems')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/speaker-systems/home-theatre-systems--soundbars',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Subwoofers',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/speaker-systems')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/speaker-systems/subwoofers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Over-Ear & On-Ear',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/headphones--earphones-consumer')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/headphones--earphones-consumer/over-ear--on-ear',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'In-Ear / Earbuds',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/headphones--earphones-consumer')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/headphones--earphones-consumer/in-ear--earbuds',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'True Wireless & Bluetooth',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/headphones--earphones-consumer')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/headphones--earphones-consumer/true-wireless--bluetooth',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Compact Portable',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/portable--bluetooth-speakers')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/portable--bluetooth-speakers/compact-portable',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Rugged / Outdoor',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/portable--bluetooth-speakers')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/portable--bluetooth-speakers/rugged--outdoor',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Party & High-Power Speakers',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/portable--bluetooth-speakers')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/portable--bluetooth-speakers/party--high-power-speakers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'MP3 / Media Players (if applicable)',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/personal-audio--accessories')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/personal-audio--accessories/mp3--media-players-if-applicable',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Docking Stations & Cradles',
  get_category_id_by_path('/consumer-audio-hi-fi--portable/personal-audio--accessories')::uuid,
  3,
  '/consumer-audio-hi-fi--portable/personal-audio--accessories/docking-stations--cradles',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Microphone Cables (XLR/XLR, XLR/Jack)',
  get_category_id_by_path('/cables-connectors--power/audio-cables')::uuid,
  3,
  '/cables-connectors--power/audio-cables/microphone-cables-xlrxlr-xlrjack',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Instrument Cables (Guitar/TS)',
  get_category_id_by_path('/cables-connectors--power/audio-cables')::uuid,
  3,
  '/cables-connectors--power/audio-cables/instrument-cables-guitarts',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Speaker Cables',
  get_category_id_by_path('/cables-connectors--power/audio-cables')::uuid,
  3,
  '/cables-connectors--power/audio-cables/speaker-cables',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Insert, Patch & Y-Cables',
  get_category_id_by_path('/cables-connectors--power/audio-cables')::uuid,
  3,
  '/cables-connectors--power/audio-cables/insert-patch--y-cables',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'MIDI & USB',
  get_category_id_by_path('/cables-connectors--power/data--digital-cables')::uuid,
  3,
  '/cables-connectors--power/data--digital-cables/midi--usb',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Network (CAT5/6/7)',
  get_category_id_by_path('/cables-connectors--power/data--digital-cables')::uuid,
  3,
  '/cables-connectors--power/data--digital-cables/network-cat567',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Digital Audio (AES/EBU, SPDIF, ADAT)',
  get_category_id_by_path('/cables-connectors--power/data--digital-cables')::uuid,
  3,
  '/cables-connectors--power/data--digital-cables/digital-audio-aesebu-spdif-adat',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'HDMI / DisplayPort',
  get_category_id_by_path('/cables-connectors--power/video--av-cables')::uuid,
  3,
  '/cables-connectors--power/video--av-cables/hdmi--displayport',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'VGA & Legacy Video',
  get_category_id_by_path('/cables-connectors--power/video--av-cables')::uuid,
  3,
  '/cables-connectors--power/video--av-cables/vga--legacy-video',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'SDI & Coax Video',
  get_category_id_by_path('/cables-connectors--power/video--av-cables')::uuid,
  3,
  '/cables-connectors--power/video--av-cables/sdi--coax-video',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'IEC & Mains Leads',
  get_category_id_by_path('/cables-connectors--power/power-cables--distribution')::uuid,
  3,
  '/cables-connectors--power/power-cables--distribution/iec--mains-leads',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Power Strips & Conditioners',
  get_category_id_by_path('/cables-connectors--power/power-cables--distribution')::uuid,
  3,
  '/cables-connectors--power/power-cables--distribution/power-strips--conditioners',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'PowerCON & Locking Connectors',
  get_category_id_by_path('/cables-connectors--power/power-cables--distribution')::uuid,
  3,
  '/cables-connectors--power/power-cables--distribution/powercon--locking-connectors',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Audio Connectors (XLR, Jack, SpeakON, RCA)',
  get_category_id_by_path('/cables-connectors--power/connectors--bulk-cable')::uuid,
  3,
  '/cables-connectors--power/connectors--bulk-cable/audio-connectors-xlr-jack-speakon-rca',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Power & PowerCON Connectors',
  get_category_id_by_path('/cables-connectors--power/connectors--bulk-cable')::uuid,
  3,
  '/cables-connectors--power/connectors--bulk-cable/power--powercon-connectors',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Bulk Audio / Speaker / Data Cable',
  get_category_id_by_path('/cables-connectors--power/connectors--bulk-cable')::uuid,
  3,
  '/cables-connectors--power/connectors--bulk-cable/bulk-audio--speaker--data-cable',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Guitar Strings, Picks, Capos, Slides',
  get_category_id_by_path('/accessories-cases-racks--stands/instrument-accessories')::uuid,
  3,
  '/accessories-cases-racks--stands/instrument-accessories/guitar-strings-picks-capos-slides',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Drumsticks, Drumkeys, Practice Pads',
  get_category_id_by_path('/accessories-cases-racks--stands/instrument-accessories')::uuid,
  3,
  '/accessories-cases-racks--stands/instrument-accessories/drumsticks-drumkeys-practice-pads',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Keyboard Covers, Pedals, Benches',
  get_category_id_by_path('/accessories-cases-racks--stands/instrument-accessories')::uuid,
  3,
  '/accessories-cases-racks--stands/instrument-accessories/keyboard-covers-pedals-benches',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Orchestral & Band Accessories',
  get_category_id_by_path('/accessories-cases-racks--stands/instrument-accessories')::uuid,
  3,
  '/accessories-cases-racks--stands/instrument-accessories/orchestral--band-accessories',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Instrument Cases & Bags',
  get_category_id_by_path('/accessories-cases-racks--stands/cases--bags')::uuid,
  3,
  '/accessories-cases-racks--stands/cases--bags/instrument-cases--bags',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Mixer & Rack Cases',
  get_category_id_by_path('/accessories-cases-racks--stands/cases--bags')::uuid,
  3,
  '/accessories-cases-racks--stands/cases--bags/mixer--rack-cases',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Speaker & Monitor Covers',
  get_category_id_by_path('/accessories-cases-racks--stands/cases--bags')::uuid,
  3,
  '/accessories-cases-racks--stands/cases--bags/speaker--monitor-covers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'DJ & Controller Cases',
  get_category_id_by_path('/accessories-cases-racks--stands/cases--bags')::uuid,
  3,
  '/accessories-cases-racks--stands/cases--bags/dj--controller-cases',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Rack Cabinets & Flightcases',
  get_category_id_by_path('/accessories-cases-racks--stands/racks--rack-accessories')::uuid,
  3,
  '/accessories-cases-racks--stands/racks--rack-accessories/rack-cabinets--flightcases',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Rack Shelves, Panels & Hardware',
  get_category_id_by_path('/accessories-cases-racks--stands/racks--rack-accessories')::uuid,
  3,
  '/accessories-cases-racks--stands/racks--rack-accessories/rack-shelves-panels--hardware',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Rack Power & Cooling',
  get_category_id_by_path('/accessories-cases-racks--stands/racks--rack-accessories')::uuid,
  3,
  '/accessories-cases-racks--stands/racks--rack-accessories/rack-power--cooling',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Instrument Stands (Guitar, Keyboard, etc.)',
  get_category_id_by_path('/accessories-cases-racks--stands/stands--mounts-general')::uuid,
  3,
  '/accessories-cases-racks--stands/stands--mounts-general/instrument-stands-guitar-keyboard-etc',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Microphone Stands & Booms',
  get_category_id_by_path('/accessories-cases-racks--stands/stands--mounts-general')::uuid,
  3,
  '/accessories-cases-racks--stands/stands--mounts-general/microphone-stands--booms',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Music Stands & Conductor Stands',
  get_category_id_by_path('/accessories-cases-racks--stands/stands--mounts-general')::uuid,
  3,
  '/accessories-cases-racks--stands/stands--mounts-general/music-stands--conductor-stands',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Replacement Drivers & HF Units',
  get_category_id_by_path('/spares-components--consumables/electronic-spares')::uuid,
  3,
  '/spares-components--consumables/electronic-spares/replacement-drivers--hf-units',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Faders, Pots & Switches',
  get_category_id_by_path('/spares-components--consumables/electronic-spares')::uuid,
  3,
  '/spares-components--consumables/electronic-spares/faders-pots--switches',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Power Supplies & Modules',
  get_category_id_by_path('/spares-components--consumables/electronic-spares')::uuid,
  3,
  '/spares-components--consumables/electronic-spares/power-supplies--modules',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Guitar Parts (Bridges, Tuners, Nuts)',
  get_category_id_by_path('/spares-components--consumables/instrument-spares')::uuid,
  3,
  '/spares-components--consumables/instrument-spares/guitar-parts-bridges-tuners-nuts',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Drum Parts (Lugs, Hoops, Pedals Parts)',
  get_category_id_by_path('/spares-components--consumables/instrument-spares')::uuid,
  3,
  '/spares-components--consumables/instrument-spares/drum-parts-lugs-hoops-pedals-parts',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Keyboard & Digital Piano Parts',
  get_category_id_by_path('/spares-components--consumables/instrument-spares')::uuid,
  3,
  '/spares-components--consumables/instrument-spares/keyboard--digital-piano-parts',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Lamps, LEDs, Boards',
  get_category_id_by_path('/spares-components--consumables/lighting--rigging-spares')::uuid,
  3,
  '/spares-components--consumables/lighting--rigging-spares/lamps-leds-boards',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Clamps, Bolts & Rigging Parts',
  get_category_id_by_path('/spares-components--consumables/lighting--rigging-spares')::uuid,
  3,
  '/spares-components--consumables/lighting--rigging-spares/clamps-bolts--rigging-parts',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Cleaning Products & Polishes',
  get_category_id_by_path('/spares-components--consumables/maintenance--care')::uuid,
  3,
  '/spares-components--consumables/maintenance--care/cleaning-products--polishes',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Lubricants & Contact Cleaners',
  get_category_id_by_path('/spares-components--consumables/maintenance--care')::uuid,
  3,
  '/spares-components--consumables/maintenance--care/lubricants--contact-cleaners',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Tools & Testers',
  get_category_id_by_path('/spares-components--consumables/maintenance--care')::uuid,
  3,
  '/spares-components--consumables/maintenance--care/tools--testers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

-- Level 4 Categories (60 categories)
INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Solid-Body',
  get_category_id_by_path('/musical-instruments/guitars--basses/electric-guitars')::uuid,
  4,
  '/musical-instruments/guitars--basses/electric-guitars/solid-body',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Semi-Hollow & Hollow',
  get_category_id_by_path('/musical-instruments/guitars--basses/electric-guitars')::uuid,
  4,
  '/musical-instruments/guitars--basses/electric-guitars/semi-hollow--hollow',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Steel-String',
  get_category_id_by_path('/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars')::uuid,
  4,
  '/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars/steel-string',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Classical / Nylon',
  get_category_id_by_path('/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars')::uuid,
  4,
  '/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars/classical--nylon',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Electric Bass',
  get_category_id_by_path('/musical-instruments/guitars--basses/basses')::uuid,
  4,
  '/musical-instruments/guitars--basses/basses/electric-bass',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Acoustic Bass',
  get_category_id_by_path('/musical-instruments/guitars--basses/basses')::uuid,
  4,
  '/musical-instruments/guitars--basses/basses/acoustic-bass',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Starter Packs',
  get_category_id_by_path('/musical-instruments/guitars--basses/guitar--bass-packs')::uuid,
  4,
  '/musical-instruments/guitars--basses/guitar--bass-packs/starter-packs',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Performance Packs',
  get_category_id_by_path('/musical-instruments/guitars--basses/guitar--bass-packs')::uuid,
  4,
  '/musical-instruments/guitars--basses/guitar--bass-packs/performance-packs',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Combo Amps',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics/guitar-amplifiers')::uuid,
  4,
  '/musical-instruments/amps--guitar-electronics/guitar-amplifiers/combo-amps',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Amp Heads',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics/guitar-amplifiers')::uuid,
  4,
  '/musical-instruments/amps--guitar-electronics/guitar-amplifiers/amp-heads',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Cabinets',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics/guitar-amplifiers')::uuid,
  4,
  '/musical-instruments/amps--guitar-electronics/guitar-amplifiers/cabinets',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Combo',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics/bass-amplifiers')::uuid,
  4,
  '/musical-instruments/amps--guitar-electronics/bass-amplifiers/combo',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Heads & Cabs',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics/bass-amplifiers')::uuid,
  4,
  '/musical-instruments/amps--guitar-electronics/bass-amplifiers/heads--cabs',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Drive & Distortion',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics/pedals--multi-fx')::uuid,
  4,
  '/musical-instruments/amps--guitar-electronics/pedals--multi-fx/drive--distortion',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Modulation & Time-Based',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics/pedals--multi-fx')::uuid,
  4,
  '/musical-instruments/amps--guitar-electronics/pedals--multi-fx/modulation--time-based',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Multi-FX & Modelers',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics/pedals--multi-fx')::uuid,
  4,
  '/musical-instruments/amps--guitar-electronics/pedals--multi-fx/multi-fx--modelers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Pedalboard Power & Controllers',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics/pedals--multi-fx')::uuid,
  4,
  '/musical-instruments/amps--guitar-electronics/pedals--multi-fx/pedalboard-power--controllers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Shell Packs',
  get_category_id_by_path('/musical-instruments/drums--percussion/acoustic-drums')::uuid,
  4,
  '/musical-instruments/drums--percussion/acoustic-drums/shell-packs',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Snare Drums',
  get_category_id_by_path('/musical-instruments/drums--percussion/acoustic-drums')::uuid,
  4,
  '/musical-instruments/drums--percussion/acoustic-drums/snare-drums',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Individual Toms & Kicks',
  get_category_id_by_path('/musical-instruments/drums--percussion/acoustic-drums')::uuid,
  4,
  '/musical-instruments/drums--percussion/acoustic-drums/individual-toms--kicks',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Sets',
  get_category_id_by_path('/musical-instruments/drums--percussion/cymbals')::uuid,
  4,
  '/musical-instruments/drums--percussion/cymbals/sets',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Individual (Ride/Crash/Hi-Hat/FX)',
  get_category_id_by_path('/musical-instruments/drums--percussion/cymbals')::uuid,
  4,
  '/musical-instruments/drums--percussion/cymbals/individual-ridecrashhi-hatfx',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Full Kits',
  get_category_id_by_path('/musical-instruments/drums--percussion/electronic-drums')::uuid,
  4,
  '/musical-instruments/drums--percussion/electronic-drums/full-kits',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Pads & Triggers',
  get_category_id_by_path('/musical-instruments/drums--percussion/electronic-drums')::uuid,
  4,
  '/musical-instruments/drums--percussion/electronic-drums/pads--triggers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Drum Modules',
  get_category_id_by_path('/musical-instruments/drums--percussion/electronic-drums')::uuid,
  4,
  '/musical-instruments/drums--percussion/electronic-drums/drum-modules',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Hand Percussion (Cajon, Bongos, Congas)',
  get_category_id_by_path('/musical-instruments/drums--percussion/percussion')::uuid,
  4,
  '/musical-instruments/drums--percussion/percussion/hand-percussion-cajon-bongos-congas',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Orchestral / Band Percussion',
  get_category_id_by_path('/musical-instruments/drums--percussion/percussion')::uuid,
  4,
  '/musical-instruments/drums--percussion/percussion/orchestral--band-percussion',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Small Percussion (Shakers, Tambourines)',
  get_category_id_by_path('/musical-instruments/drums--percussion/percussion')::uuid,
  4,
  '/musical-instruments/drums--percussion/percussion/small-percussion-shakers-tambourines',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Stands & Pedals',
  get_category_id_by_path('/musical-instruments/drums--percussion/drum-hardware--accessories')::uuid,
  4,
  '/musical-instruments/drums--percussion/drum-hardware--accessories/stands--pedals',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Drumheads',
  get_category_id_by_path('/musical-instruments/drums--percussion/drum-hardware--accessories')::uuid,
  4,
  '/musical-instruments/drums--percussion/drum-hardware--accessories/drumheads',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Cases & Bags',
  get_category_id_by_path('/musical-instruments/drums--percussion/drum-hardware--accessories')::uuid,
  4,
  '/musical-instruments/drums--percussion/drum-hardware--accessories/cases--bags',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Console / Home',
  get_category_id_by_path('/musical-instruments/keyboards--pianos/digital-pianos')::uuid,
  4,
  '/musical-instruments/keyboards--pianos/digital-pianos/console--home',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Stage Pianos',
  get_category_id_by_path('/musical-instruments/keyboards--pianos/digital-pianos')::uuid,
  4,
  '/musical-instruments/keyboards--pianos/digital-pianos/stage-pianos',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Performance Synths',
  get_category_id_by_path('/musical-instruments/keyboards--pianos/synthesizers--workstations')::uuid,
  4,
  '/musical-instruments/keyboards--pianos/synthesizers--workstations/performance-synths',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Workstations',
  get_category_id_by_path('/musical-instruments/keyboards--pianos/synthesizers--workstations')::uuid,
  4,
  '/musical-instruments/keyboards--pianos/synthesizers--workstations/workstations',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Stands & Benches',
  get_category_id_by_path('/musical-instruments/keyboards--pianos/keyboard-accessories')::uuid,
  4,
  '/musical-instruments/keyboards--pianos/keyboard-accessories/stands--benches',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Pedals & Expression',
  get_category_id_by_path('/musical-instruments/keyboards--pianos/keyboard-accessories')::uuid,
  4,
  '/musical-instruments/keyboards--pianos/keyboard-accessories/pedals--expression',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Cases & Bags',
  get_category_id_by_path('/musical-instruments/keyboards--pianos/keyboard-accessories')::uuid,
  4,
  '/musical-instruments/keyboards--pianos/keyboard-accessories/cases--bags',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Active',
  get_category_id_by_path('/studio-recording--production/studio-monitors--headphones/nearfield--midfield-monitors')::uuid,
  4,
  '/studio-recording--production/studio-monitors--headphones/nearfield--midfield-monitors/active',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Passive',
  get_category_id_by_path('/studio-recording--production/studio-monitors--headphones/nearfield--midfield-monitors')::uuid,
  4,
  '/studio-recording--production/studio-monitors--headphones/nearfield--midfield-monitors/passive',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Closed-Back',
  get_category_id_by_path('/studio-recording--production/studio-monitors--headphones/studio-headphones')::uuid,
  4,
  '/studio-recording--production/studio-monitors--headphones/studio-headphones/closed-back',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Open / Semi-Open',
  get_category_id_by_path('/studio-recording--production/studio-monitors--headphones/studio-headphones')::uuid,
  4,
  '/studio-recording--production/studio-monitors--headphones/studio-headphones/open--semi-open',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Large Diaphragm',
  get_category_id_by_path('/studio-recording--production/microphones-studio/condenser-mics')::uuid,
  4,
  '/studio-recording--production/microphones-studio/condenser-mics/large-diaphragm',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Small Diaphragm',
  get_category_id_by_path('/studio-recording--production/microphones-studio/condenser-mics')::uuid,
  4,
  '/studio-recording--production/microphones-studio/condenser-mics/small-diaphragm',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'All-in-One Column Systems',
  get_category_id_by_path('/live-sound--pa/pa-systems--loudspeakers/portable-pa-systems')::uuid,
  4,
  '/live-sound--pa/pa-systems--loudspeakers/portable-pa-systems/all-in-one-column-systems',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Small PA Packages (Speaker + Mixer)',
  get_category_id_by_path('/live-sound--pa/pa-systems--loudspeakers/portable-pa-systems')::uuid,
  4,
  '/live-sound--pa/pa-systems--loudspeakers/portable-pa-systems/small-pa-packages-speaker--mixer',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Active (Powered)',
  get_category_id_by_path('/live-sound--pa/pa-systems--loudspeakers/full-range-speakers')::uuid,
  4,
  '/live-sound--pa/pa-systems--loudspeakers/full-range-speakers/active-powered',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Passive',
  get_category_id_by_path('/live-sound--pa/pa-systems--loudspeakers/full-range-speakers')::uuid,
  4,
  '/live-sound--pa/pa-systems--loudspeakers/full-range-speakers/passive',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Active',
  get_category_id_by_path('/live-sound--pa/pa-systems--loudspeakers/subwoofers')::uuid,
  4,
  '/live-sound--pa/pa-systems--loudspeakers/subwoofers/active',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Passive',
  get_category_id_by_path('/live-sound--pa/pa-systems--loudspeakers/subwoofers')::uuid,
  4,
  '/live-sound--pa/pa-systems--loudspeakers/subwoofers/passive',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Compact (2–12 channels)',
  get_category_id_by_path('/live-sound--pa/mixing-consoles/analog-mixers')::uuid,
  4,
  '/live-sound--pa/mixing-consoles/analog-mixers/compact-212-channels',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Medium / Large',
  get_category_id_by_path('/live-sound--pa/mixing-consoles/analog-mixers')::uuid,
  4,
  '/live-sound--pa/mixing-consoles/analog-mixers/medium--large',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Rack / Stagebox Mixers',
  get_category_id_by_path('/live-sound--pa/mixing-consoles/digital-mixers')::uuid,
  4,
  '/live-sound--pa/mixing-consoles/digital-mixers/rack--stagebox-mixers',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Surface + Stagebox Systems',
  get_category_id_by_path('/live-sound--pa/mixing-consoles/digital-mixers')::uuid,
  4,
  '/live-sound--pa/mixing-consoles/digital-mixers/surface--stagebox-systems',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Fixed Frame',
  get_category_id_by_path('/installed-av-conferencing--video/projectors--screens/projection-screens')::uuid,
  4,
  '/installed-av-conferencing--video/projectors--screens/projection-screens/fixed-frame',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Manual / Electric Pull-Down',
  get_category_id_by_path('/installed-av-conferencing--video/projectors--screens/projection-screens')::uuid,
  4,
  '/installed-av-conferencing--video/projectors--screens/projection-screens/manual--electric-pull-down',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Portable / Tripod',
  get_category_id_by_path('/installed-av-conferencing--video/projectors--screens/projection-screens')::uuid,
  4,
  '/installed-av-conferencing--video/projectors--screens/projection-screens/portable--tripod',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Fixed',
  get_category_id_by_path('/installed-av-conferencing--video/displays--mounting/tv--display-mounts')::uuid,
  4,
  '/installed-av-conferencing--video/displays--mounting/tv--display-mounts/fixed',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Tilt',
  get_category_id_by_path('/installed-av-conferencing--video/displays--mounting/tv--display-mounts')::uuid,
  4,
  '/installed-av-conferencing--video/displays--mounting/tv--display-mounts/tilt',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Full Motion / Articulating',
  get_category_id_by_path('/installed-av-conferencing--video/displays--mounting/tv--display-mounts')::uuid,
  4,
  '/installed-av-conferencing--video/displays--mounting/tv--display-mounts/full-motion--articulating',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

-- Level 5 Categories (14 categories)
INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Standard (ST/LP/Singlecut etc.)',
  get_category_id_by_path('/musical-instruments/guitars--basses/electric-guitars/solid-body')::uuid,
  5,
  '/musical-instruments/guitars--basses/electric-guitars/solid-body/standard-stlpsinglecut-etc',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Extended Range (7/8-string)',
  get_category_id_by_path('/musical-instruments/guitars--basses/electric-guitars/solid-body')::uuid,
  5,
  '/musical-instruments/guitars--basses/electric-guitars/solid-body/extended-range-78-string',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Semi-Hollow',
  get_category_id_by_path('/musical-instruments/guitars--basses/electric-guitars/semi-hollow--hollow')::uuid,
  5,
  '/musical-instruments/guitars--basses/electric-guitars/semi-hollow--hollow/semi-hollow',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Full Hollow / Jazz',
  get_category_id_by_path('/musical-instruments/guitars--basses/electric-guitars/semi-hollow--hollow')::uuid,
  5,
  '/musical-instruments/guitars--basses/electric-guitars/semi-hollow--hollow/full-hollow--jazz',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Dreadnought / Jumbo',
  get_category_id_by_path('/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars/steel-string')::uuid,
  5,
  '/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars/steel-string/dreadnought--jumbo',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Parlor / Travel',
  get_category_id_by_path('/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars/steel-string')::uuid,
  5,
  '/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars/steel-string/parlor--travel',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Full-size',
  get_category_id_by_path('/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars/classical--nylon')::uuid,
  5,
  '/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars/classical--nylon/full-size',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  '3/4 & 1/2 size',
  get_category_id_by_path('/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars/classical--nylon')::uuid,
  5,
  '/musical-instruments/guitars--basses/acoustic--electro-acoustic-guitars/classical--nylon/34--12-size',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  '4-String',
  get_category_id_by_path('/musical-instruments/guitars--basses/basses/electric-bass')::uuid,
  5,
  '/musical-instruments/guitars--basses/basses/electric-bass/4-string',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  '5-String+',
  get_category_id_by_path('/musical-instruments/guitars--basses/basses/electric-bass')::uuid,
  5,
  '/musical-instruments/guitars--basses/basses/electric-bass/5-string',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Solid-State',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics/guitar-amplifiers/combo-amps')::uuid,
  5,
  '/musical-instruments/amps--guitar-electronics/guitar-amplifiers/combo-amps/solid-state',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  'Tube',
  get_category_id_by_path('/musical-instruments/amps--guitar-electronics/guitar-amplifiers/combo-amps')::uuid,
  5,
  '/musical-instruments/amps--guitar-electronics/guitar-amplifiers/combo-amps/tube',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  '8–10"',
  get_category_id_by_path('/live-sound--pa/pa-systems--loudspeakers/full-range-speakers/active-powered')::uuid,
  5,
  '/live-sound--pa/pa-systems--loudspeakers/full-range-speakers/active-powered/810',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES (
  '12–15"+',
  get_category_id_by_path('/live-sound--pa/pa-systems--loudspeakers/full-range-speakers/active-powered')::uuid,
  5,
  '/live-sound--pa/pa-systems--loudspeakers/full-range-speakers/active-powered/1215',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (path) DO NOTHING;

-- Cleanup helper function
DROP FUNCTION IF EXISTS get_category_id_by_path(TEXT);

COMMIT;

-- Verification queries
-- SELECT level, COUNT(*) FROM core.category GROUP BY level ORDER BY level;
-- SELECT name, path, level FROM core.category WHERE level = 1 ORDER BY name;