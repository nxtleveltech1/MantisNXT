BEGIN;

-- Insert categories for levels 2-5 only (level 1 already inserted)

-- ===============================================
-- NEW CATEGORY HIERARCHY MIGRATION
-- Generated from category hierarchy specification
-- ===============================================



-- Step 3: Insert new category hierarchy
















-- 1.1 Electric Guitars (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Electric Guitars',
  parent.category_id,
  2,
  '/guitars-basses-amps/electric-guitars',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps';

-- 1.2 Acoustic/Electro-Acoustic Guitars (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Acoustic/Electro-Acoustic Guitars',
  parent.category_id,
  2,
  '/guitars-basses-amps/acousticelectro-acoustic-guitars',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps';

-- 1.3 Basses (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Basses',
  parent.category_id,
  2,
  '/guitars-basses-amps/basses',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps';

-- 1.4 Guitar & Bass Packs (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Guitar & Bass Packs',
  parent.category_id,
  2,
  '/guitars-basses-amps/guitar-bass-packs',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps';

-- 1.5 Guitar Amplifiers (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Guitar Amplifiers',
  parent.category_id,
  2,
  '/guitars-basses-amps/guitar-amplifiers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps';

-- 1.6 Bass Amplifiers (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Bass Amplifiers',
  parent.category_id,
  2,
  '/guitars-basses-amps/bass-amplifiers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps';

-- 1.7 Pedals & Multi-FX (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Pedals & Multi-FX',
  parent.category_id,
  2,
  '/guitars-basses-amps/pedals-multi-fx',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps';

-- 2.1 Acoustic Drums (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Acoustic Drums',
  parent.category_id,
  2,
  '/drums-percussion/acoustic-drums',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion';

-- 2.2 Cymbals (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Cymbals',
  parent.category_id,
  2,
  '/drums-percussion/cymbals',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion';

-- 2.3 Electronic Drums (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Electronic Drums',
  parent.category_id,
  2,
  '/drums-percussion/electronic-drums',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion';

-- 2.4 Percussion (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Percussion',
  parent.category_id,
  2,
  '/drums-percussion/percussion',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion';

-- 2.5 Drum Hardware & Accessories (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Drum Hardware & Accessories',
  parent.category_id,
  2,
  '/drums-percussion/drum-hardware-accessories',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion';

-- 3.1 Digital Pianos (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Digital Pianos',
  parent.category_id,
  2,
  '/keyboards-pianos-synths/digital-pianos',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/keyboards-pianos-synths';

-- 3.2 Synthesizers & Workstations (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Synthesizers & Workstations',
  parent.category_id,
  2,
  '/keyboards-pianos-synths/synthesizers-workstations',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/keyboards-pianos-synths';

-- 3.3 Portable Keyboards & Arrangers (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Portable Keyboards & Arrangers',
  parent.category_id,
  2,
  '/keyboards-pianos-synths/portable-keyboards-arrangers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/keyboards-pianos-synths';

-- 3.4 MIDI Controllers & Pad Controllers (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'MIDI Controllers & Pad Controllers',
  parent.category_id,
  2,
  '/keyboards-pianos-synths/midi-controllers-pad-controllers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/keyboards-pianos-synths';

-- 3.5 Keyboard Accessories (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Keyboard Accessories',
  parent.category_id,
  2,
  '/keyboards-pianos-synths/keyboard-accessories',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/keyboards-pianos-synths';

-- 4.1 Orchestral Strings (Violin/Viola/Cello/Double Bass) (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Orchestral Strings (Violin/Viola/Cello/Double Bass)',
  parent.category_id,
  2,
  '/orchestral-band-folk/orchestral-strings-violinviolacellodouble-bass',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/orchestral-band-folk';

-- 4.2 Brass & Woodwind (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Brass & Woodwind',
  parent.category_id,
  2,
  '/orchestral-band-folk/brass-woodwind',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/orchestral-band-folk';

-- 4.3 Folk & Traditional (Ukulele/Mandolin/Banjo) (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Folk & Traditional (Ukulele/Mandolin/Banjo)',
  parent.category_id,
  2,
  '/orchestral-band-folk/folk-traditional-ukulelemandolinbanjo',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/orchestral-band-folk';

-- 4.4 Educational Packs & Classroom Instruments (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Educational Packs & Classroom Instruments',
  parent.category_id,
  2,
  '/orchestral-band-folk/educational-packs-classroom-instruments',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/orchestral-band-folk';

-- 5.1 Audio Interfaces & Converters (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Audio Interfaces & Converters',
  parent.category_id,
  2,
  '/studio-recording-production/audio-interfaces-converters',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production';

-- 5.2 Studio Monitors & Headphones (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Studio Monitors & Headphones',
  parent.category_id,
  2,
  '/studio-recording-production/studio-monitors-headphones',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production';

-- 5.3 Outboard & Signal Processing (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Outboard & Signal Processing',
  parent.category_id,
  2,
  '/studio-recording-production/outboard-signal-processing',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production';

-- 5.4 Recording Tools & Controllers (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Recording Tools & Controllers',
  parent.category_id,
  2,
  '/studio-recording-production/recording-tools-controllers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production';

-- 5.5 Studio Furniture & Acoustic Treatment (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Studio Furniture & Acoustic Treatment',
  parent.category_id,
  2,
  '/studio-recording-production/studio-furniture-acoustic-treatment',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production';

-- 6.1 Studio Microphones (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Studio Microphones',
  parent.category_id,
  2,
  '/microphones-wireless/studio-microphones',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless';

-- 6.2 Live Microphones (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Live Microphones',
  parent.category_id,
  2,
  '/microphones-wireless/live-microphones',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless';

-- 6.3 Wireless Systems (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Wireless Systems',
  parent.category_id,
  2,
  '/microphones-wireless/wireless-systems',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless';

-- 7.1 PA Systems & Loudspeakers (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'PA Systems & Loudspeakers',
  parent.category_id,
  2,
  '/live-sound-pa/pa-systems-loudspeakers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa';

-- 7.2 Mixing Consoles (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Mixing Consoles',
  parent.category_id,
  2,
  '/live-sound-pa/mixing-consoles',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa';

-- 7.3 Signal Processing & System Management (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Signal Processing & System Management',
  parent.category_id,
  2,
  '/live-sound-pa/signal-processing-system-management',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa';

-- 7.4 Public Address & 100V Line (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Public Address & 100V Line',
  parent.category_id,
  2,
  '/live-sound-pa/public-address-100v-line',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa';

-- 7.5 Live Sound Accessories (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Live Sound Accessories',
  parent.category_id,
  2,
  '/live-sound-pa/live-sound-accessories',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa';

-- 8.1 DJ Players & Controllers (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DJ Players & Controllers',
  parent.category_id,
  2,
  '/dj-electronic-music/dj-players-controllers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music';

-- 8.2 DJ Mixers (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DJ Mixers',
  parent.category_id,
  2,
  '/dj-electronic-music/dj-mixers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music';

-- 8.3 Turntables & Cartridges (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Turntables & Cartridges',
  parent.category_id,
  2,
  '/dj-electronic-music/turntables-cartridges',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music';

-- 8.4 DJ Monitoring & PA (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DJ Monitoring & PA',
  parent.category_id,
  2,
  '/dj-electronic-music/dj-monitoring-pa',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music';

-- 8.5 DJ Effects & Accessories (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DJ Effects & Accessories',
  parent.category_id,
  2,
  '/dj-electronic-music/dj-effects-accessories',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music';

-- 9.1 Entertainment Lighting Fixtures (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Entertainment Lighting Fixtures',
  parent.category_id,
  2,
  '/lighting-stage-effects/entertainment-lighting-fixtures',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects';

-- 9.2 Architectural & Install Lighting (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Architectural & Install Lighting',
  parent.category_id,
  2,
  '/lighting-stage-effects/architectural-install-lighting',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects';

-- 9.3 Control & Dimming (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Control & Dimming',
  parent.category_id,
  2,
  '/lighting-stage-effects/control-dimming',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects';

-- 9.4 Effects Machines (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Effects Machines',
  parent.category_id,
  2,
  '/lighting-stage-effects/effects-machines',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects';

-- 9.5 Truss, Staging & Rigging (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Truss, Staging & Rigging',
  parent.category_id,
  2,
  '/lighting-stage-effects/truss-staging-rigging',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects';

-- 9.6 Stands & Support (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Stands & Support',
  parent.category_id,
  2,
  '/lighting-stage-effects/stands-support',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects';

-- 10.1 DAWs & Editors (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DAWs & Editors',
  parent.category_id,
  2,
  '/software-plugins/daws-editors',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/software-plugins';

-- 10.2 Virtual Instruments (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Virtual Instruments',
  parent.category_id,
  2,
  '/software-plugins/virtual-instruments',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/software-plugins';

-- 10.3 Effects Plugins (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Effects Plugins',
  parent.category_id,
  2,
  '/software-plugins/effects-plugins',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/software-plugins';

-- 10.4 Utilities (Converters/MIDI Tools) (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Utilities (Converters/MIDI Tools)',
  parent.category_id,
  2,
  '/software-plugins/utilities-convertersmidi-tools',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/software-plugins';

-- 11.1 Projectors & Screens (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Projectors & Screens',
  parent.category_id,
  2,
  '/installed-av-conferencing-video/projectors-screens',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video';

-- 11.2 Displays & Mounting (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Displays & Mounting',
  parent.category_id,
  2,
  '/installed-av-conferencing-video/displays-mounting',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video';

-- 11.3 Conferencing & Collaboration (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Conferencing & Collaboration',
  parent.category_id,
  2,
  '/installed-av-conferencing-video/conferencing-collaboration',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video';

-- 11.4 Signal Management & Distribution (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Signal Management & Distribution',
  parent.category_id,
  2,
  '/installed-av-conferencing-video/signal-management-distribution',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video';

-- 11.5 Installed Audio (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Installed Audio',
  parent.category_id,
  2,
  '/installed-av-conferencing-video/installed-audio',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video';

-- 12.1 Home Hi-Fi Components (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Home Hi-Fi Components',
  parent.category_id,
  2,
  '/consumer-audio-hi-fi-portable/home-hi-fi-components',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable';

-- 12.2 Speaker Systems (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Speaker Systems',
  parent.category_id,
  2,
  '/consumer-audio-hi-fi-portable/speaker-systems',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable';

-- 12.3 Headphones & Earphones (Consumer) (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Headphones & Earphones (Consumer)',
  parent.category_id,
  2,
  '/consumer-audio-hi-fi-portable/headphones-earphones-consumer',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable';

-- 12.4 Portable & Bluetooth Speakers (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Portable & Bluetooth Speakers',
  parent.category_id,
  2,
  '/consumer-audio-hi-fi-portable/portable-bluetooth-speakers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable';

-- 12.5 Personal Audio & Accessories (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Personal Audio & Accessories',
  parent.category_id,
  2,
  '/consumer-audio-hi-fi-portable/personal-audio-accessories',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable';

-- 13.1 Audio Cables (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Audio Cables',
  parent.category_id,
  2,
  '/cables-connectors-power/audio-cables',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power';

-- 13.2 Data & Digital Cables (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Data & Digital Cables',
  parent.category_id,
  2,
  '/cables-connectors-power/data-digital-cables',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power';

-- 13.3 Video & AV Cables (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Video & AV Cables',
  parent.category_id,
  2,
  '/cables-connectors-power/video-av-cables',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power';

-- 13.4 Power Cables & Distribution (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Power Cables & Distribution',
  parent.category_id,
  2,
  '/cables-connectors-power/power-cables-distribution',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power';

-- 13.5 Connectors & Bulk Cable (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Connectors & Bulk Cable',
  parent.category_id,
  2,
  '/cables-connectors-power/connectors-bulk-cable',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power';

-- 14.1 Instrument Accessories (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Instrument Accessories',
  parent.category_id,
  2,
  '/accessories-cases-racks-stands/instrument-accessories',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands';

-- 14.2 Cases & Bags (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Cases & Bags',
  parent.category_id,
  2,
  '/accessories-cases-racks-stands/cases-bags',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands';

-- 14.3 Racks & Rack Accessories (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Racks & Rack Accessories',
  parent.category_id,
  2,
  '/accessories-cases-racks-stands/racks-rack-accessories',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands';

-- 14.4 Stands & Mounts (General) (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Stands & Mounts (General)',
  parent.category_id,
  2,
  '/accessories-cases-racks-stands/stands-mounts-general',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands';

-- 15.1 Electronic Spares (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Electronic Spares',
  parent.category_id,
  2,
  '/spares-components-consumables/electronic-spares',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables';

-- 15.2 Instrument Spares (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Instrument Spares',
  parent.category_id,
  2,
  '/spares-components-consumables/instrument-spares',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables';

-- 15.3 Lighting & Rigging Spares (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Lighting & Rigging Spares',
  parent.category_id,
  2,
  '/spares-components-consumables/lighting-rigging-spares',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables';

-- 15.4 Maintenance & Care (Level 2)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Maintenance & Care',
  parent.category_id,
  2,
  '/spares-components-consumables/maintenance-care',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables';

-- 1.1.1 Solid-Body (Standard/Extended Range) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Solid-Body (Standard/Extended Range)',
  parent.category_id,
  3,
  '/guitars-basses-amps/electric-guitars/solid-body-standardextended-range',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/electric-guitars';

-- 1.1.2 Semi/Full Hollow (Semi-Hollow/Jazz) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Semi/Full Hollow (Semi-Hollow/Jazz)',
  parent.category_id,
  3,
  '/guitars-basses-amps/electric-guitars/semifull-hollow-semi-hollowjazz',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/electric-guitars';

-- 1.2.1 Steel-String (Dreadnought/Jumbo/Parlor/Travel) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Steel-String (Dreadnought/Jumbo/Parlor/Travel)',
  parent.category_id,
  3,
  '/guitars-basses-amps/acousticelectro-acoustic-guitars/steel-string-dreadnoughtjumboparlortravel',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/acousticelectro-acoustic-guitars';

-- 1.2.2 Nylon/Classical (Full-Size/Reduced Size) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Nylon/Classical (Full-Size/Reduced Size)',
  parent.category_id,
  3,
  '/guitars-basses-amps/acousticelectro-acoustic-guitars/nylonclassical-full-sizereduced-size',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/acousticelectro-acoustic-guitars';

-- 1.3.1 Electric Bass (4-String/5+ String) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Electric Bass (4-String/5+ String)',
  parent.category_id,
  3,
  '/guitars-basses-amps/basses/electric-bass-4-string5-string',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/basses';

-- 1.3.2 Acoustic Bass (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Acoustic Bass',
  parent.category_id,
  3,
  '/guitars-basses-amps/basses/acoustic-bass',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/basses';

-- 1.4.1 Starter Packs (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Starter Packs',
  parent.category_id,
  3,
  '/guitars-basses-amps/guitar-bass-packs/starter-packs',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/guitar-bass-packs';

-- 1.4.2 Performance Packs (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Performance Packs',
  parent.category_id,
  3,
  '/guitars-basses-amps/guitar-bass-packs/performance-packs',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/guitar-bass-packs';

-- 1.5.1 Combo Amps (Solid-State/Tube) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Combo Amps (Solid-State/Tube)',
  parent.category_id,
  3,
  '/guitars-basses-amps/guitar-amplifiers/combo-amps-solid-statetube',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/guitar-amplifiers';

-- 1.5.2 Amp Heads (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Amp Heads',
  parent.category_id,
  3,
  '/guitars-basses-amps/guitar-amplifiers/amp-heads',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/guitar-amplifiers';

-- 1.5.3 Cabinets (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Cabinets',
  parent.category_id,
  3,
  '/guitars-basses-amps/guitar-amplifiers/cabinets',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/guitar-amplifiers';

-- 1.6.1 Combo (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Combo',
  parent.category_id,
  3,
  '/guitars-basses-amps/bass-amplifiers/combo',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/bass-amplifiers';

-- 1.6.2 Heads & Cabs (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Heads & Cabs',
  parent.category_id,
  3,
  '/guitars-basses-amps/bass-amplifiers/heads-cabs',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/bass-amplifiers';

-- 1.7.1 Drive & Distortion (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Drive & Distortion',
  parent.category_id,
  3,
  '/guitars-basses-amps/pedals-multi-fx/drive-distortion',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/pedals-multi-fx';

-- 1.7.2 Modulation & Time-Based (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Modulation & Time-Based',
  parent.category_id,
  3,
  '/guitars-basses-amps/pedals-multi-fx/modulation-time-based',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/pedals-multi-fx';

-- 1.7.3 Multi-FX & Modelers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Multi-FX & Modelers',
  parent.category_id,
  3,
  '/guitars-basses-amps/pedals-multi-fx/multi-fx-modelers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/pedals-multi-fx';

-- 1.7.4 Pedalboard Power & Controllers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Pedalboard Power & Controllers',
  parent.category_id,
  3,
  '/guitars-basses-amps/pedals-multi-fx/pedalboard-power-controllers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/guitars-basses-amps/pedals-multi-fx';

-- 2.1.1 Shell Packs (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Shell Packs',
  parent.category_id,
  3,
  '/drums-percussion/acoustic-drums/shell-packs',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/acoustic-drums';

-- 2.1.2 Snare Drums (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Snare Drums',
  parent.category_id,
  3,
  '/drums-percussion/acoustic-drums/snare-drums',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/acoustic-drums';

-- 2.1.3 Individual Toms & Kicks (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Individual Toms & Kicks',
  parent.category_id,
  3,
  '/drums-percussion/acoustic-drums/individual-toms-kicks',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/acoustic-drums';

-- 2.2.1 Sets (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Sets',
  parent.category_id,
  3,
  '/drums-percussion/cymbals/sets',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/cymbals';

-- 2.2.2 Individual (Ride/Crash/Hi-Hat/FX) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Individual (Ride/Crash/Hi-Hat/FX)',
  parent.category_id,
  3,
  '/drums-percussion/cymbals/individual-ridecrashhi-hatfx',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/cymbals';

-- 2.3.1 Full Kits (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Full Kits',
  parent.category_id,
  3,
  '/drums-percussion/electronic-drums/full-kits',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/electronic-drums';

-- 2.3.2 Pads & Triggers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Pads & Triggers',
  parent.category_id,
  3,
  '/drums-percussion/electronic-drums/pads-triggers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/electronic-drums';

-- 2.3.3 Drum Modules (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Drum Modules',
  parent.category_id,
  3,
  '/drums-percussion/electronic-drums/drum-modules',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/electronic-drums';

-- 2.4.1 Hand Percussion (Cajon/Bongos/Congas) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Hand Percussion (Cajon/Bongos/Congas)',
  parent.category_id,
  3,
  '/drums-percussion/percussion/hand-percussion-cajonbongoscongas',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/percussion';

-- 2.4.2 Orchestral/Band Percussion (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Orchestral/Band Percussion',
  parent.category_id,
  3,
  '/drums-percussion/percussion/orchestralband-percussion',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/percussion';

-- 2.4.3 Small Percussion (Shakers/Tambourines) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Small Percussion (Shakers/Tambourines)',
  parent.category_id,
  3,
  '/drums-percussion/percussion/small-percussion-shakerstambourines',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/percussion';

-- 2.5.1 Stands & Pedals (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Stands & Pedals',
  parent.category_id,
  3,
  '/drums-percussion/drum-hardware-accessories/stands-pedals',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/drum-hardware-accessories';

-- 2.5.2 Drumheads (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Drumheads',
  parent.category_id,
  3,
  '/drums-percussion/drum-hardware-accessories/drumheads',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/drum-hardware-accessories';

-- 2.5.3 Cases & Bags (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Cases & Bags',
  parent.category_id,
  3,
  '/drums-percussion/drum-hardware-accessories/cases-bags',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/drums-percussion/drum-hardware-accessories';

-- 3.1.1 Console/Home (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Console/Home',
  parent.category_id,
  3,
  '/keyboards-pianos-synths/digital-pianos/consolehome',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/keyboards-pianos-synths/digital-pianos';

-- 3.1.2 Stage Pianos (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Stage Pianos',
  parent.category_id,
  3,
  '/keyboards-pianos-synths/digital-pianos/stage-pianos',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/keyboards-pianos-synths/digital-pianos';

-- 3.2.1 Performance Synths (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Performance Synths',
  parent.category_id,
  3,
  '/keyboards-pianos-synths/synthesizers-workstations/performance-synths',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/keyboards-pianos-synths/synthesizers-workstations';

-- 3.2.2 Workstations (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Workstations',
  parent.category_id,
  3,
  '/keyboards-pianos-synths/synthesizers-workstations/workstations',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/keyboards-pianos-synths/synthesizers-workstations';

-- 3.5.1 Stands & Benches (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Stands & Benches',
  parent.category_id,
  3,
  '/keyboards-pianos-synths/keyboard-accessories/stands-benches',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/keyboards-pianos-synths/keyboard-accessories';

-- 3.5.2 Pedals & Expression (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Pedals & Expression',
  parent.category_id,
  3,
  '/keyboards-pianos-synths/keyboard-accessories/pedals-expression',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/keyboards-pianos-synths/keyboard-accessories';

-- 3.5.3 Cases & Bags (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Cases & Bags',
  parent.category_id,
  3,
  '/keyboards-pianos-synths/keyboard-accessories/cases-bags',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/keyboards-pianos-synths/keyboard-accessories';

-- 5.1.1 Desktop Interfaces (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Desktop Interfaces',
  parent.category_id,
  3,
  '/studio-recording-production/audio-interfaces-converters/desktop-interfaces',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/audio-interfaces-converters';

-- 5.1.2 Rackmount Interfaces (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Rackmount Interfaces',
  parent.category_id,
  3,
  '/studio-recording-production/audio-interfaces-converters/rackmount-interfaces',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/audio-interfaces-converters';

-- 5.1.3 Digital Converters & Clocks (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Digital Converters & Clocks',
  parent.category_id,
  3,
  '/studio-recording-production/audio-interfaces-converters/digital-converters-clocks',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/audio-interfaces-converters';

-- 5.2.1 Nearfield & Midfield Monitors (Active/Passive) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Nearfield & Midfield Monitors (Active/Passive)',
  parent.category_id,
  3,
  '/studio-recording-production/studio-monitors-headphones/nearfield-midfield-monitors-activepassive',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/studio-monitors-headphones';

-- 5.2.2 Subwoofers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Subwoofers',
  parent.category_id,
  3,
  '/studio-recording-production/studio-monitors-headphones/subwoofers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/studio-monitors-headphones';

-- 5.2.3 Studio Headphones (Closed-Back/Open/Semi-Open) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Studio Headphones (Closed-Back/Open/Semi-Open)',
  parent.category_id,
  3,
  '/studio-recording-production/studio-monitors-headphones/studio-headphones-closed-backopensemi-open',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/studio-monitors-headphones';

-- 5.2.4 In-Ear Monitoring (Studio & Stage) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'In-Ear Monitoring (Studio & Stage)',
  parent.category_id,
  3,
  '/studio-recording-production/studio-monitors-headphones/in-ear-monitoring-studio-stage',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/studio-monitors-headphones';

-- 5.3.1 Preamps & Channel Strips (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Preamps & Channel Strips',
  parent.category_id,
  3,
  '/studio-recording-production/outboard-signal-processing/preamps-channel-strips',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/outboard-signal-processing';

-- 5.3.2 Compressors & Limiters (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Compressors & Limiters',
  parent.category_id,
  3,
  '/studio-recording-production/outboard-signal-processing/compressors-limiters',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/outboard-signal-processing';

-- 5.3.3 EQ & Filters (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'EQ & Filters',
  parent.category_id,
  3,
  '/studio-recording-production/outboard-signal-processing/eq-filters',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/outboard-signal-processing';

-- 5.3.4 Multi-FX & Reverb Units (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Multi-FX & Reverb Units',
  parent.category_id,
  3,
  '/studio-recording-production/outboard-signal-processing/multi-fx-reverb-units',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/outboard-signal-processing';

-- 5.3.5 Monitor Controllers & Headphone Amps (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Monitor Controllers & Headphone Amps',
  parent.category_id,
  3,
  '/studio-recording-production/outboard-signal-processing/monitor-controllers-headphone-amps',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/outboard-signal-processing';

-- 5.4.1 DAW Controllers & Control Surfaces (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DAW Controllers & Control Surfaces',
  parent.category_id,
  3,
  '/studio-recording-production/recording-tools-controllers/daw-controllers-control-surfaces',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/recording-tools-controllers';

-- 5.4.2 MIDI Keyboards & Pad Controllers (Studio) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'MIDI Keyboards & Pad Controllers (Studio)',
  parent.category_id,
  3,
  '/studio-recording-production/recording-tools-controllers/midi-keyboards-pad-controllers-studio',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/recording-tools-controllers';

-- 5.4.3 Studio Computers / Audio PCs (if applicable) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Studio Computers / Audio PCs (if applicable)',
  parent.category_id,
  3,
  '/studio-recording-production/recording-tools-controllers/studio-computers-audio-pcs-if-applicable',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/recording-tools-controllers';

-- 5.5.1 Studio Desks & Racks (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Studio Desks & Racks',
  parent.category_id,
  3,
  '/studio-recording-production/studio-furniture-acoustic-treatment/studio-desks-racks',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/studio-furniture-acoustic-treatment';

-- 5.5.2 Monitor Stands (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Monitor Stands',
  parent.category_id,
  3,
  '/studio-recording-production/studio-furniture-acoustic-treatment/monitor-stands',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/studio-furniture-acoustic-treatment';

-- 5.5.3 Acoustic Panels & Bass Traps (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Acoustic Panels & Bass Traps',
  parent.category_id,
  3,
  '/studio-recording-production/studio-furniture-acoustic-treatment/acoustic-panels-bass-traps',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/studio-furniture-acoustic-treatment';

-- 5.5.4 Vocal Booths & Reflection Filters (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Vocal Booths & Reflection Filters',
  parent.category_id,
  3,
  '/studio-recording-production/studio-furniture-acoustic-treatment/vocal-booths-reflection-filters',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/studio-recording-production/studio-furniture-acoustic-treatment';

-- 6.1.1 Condenser Mics (Large Diaphragm/Small Diaphragm) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Condenser Mics (Large Diaphragm/Small Diaphragm)',
  parent.category_id,
  3,
  '/microphones-wireless/studio-microphones/condenser-mics-large-diaphragmsmall-diaphragm',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/studio-microphones';

-- 6.1.2 Dynamic Mics (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Dynamic Mics',
  parent.category_id,
  3,
  '/microphones-wireless/studio-microphones/dynamic-mics',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/studio-microphones';

-- 6.1.3 Ribbon Mics (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Ribbon Mics',
  parent.category_id,
  3,
  '/microphones-wireless/studio-microphones/ribbon-mics',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/studio-microphones';

-- 6.1.4 USB & Podcast Mics (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'USB & Podcast Mics',
  parent.category_id,
  3,
  '/microphones-wireless/studio-microphones/usb-podcast-mics',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/studio-microphones';

-- 6.1.5 Mic Packs & Bundles (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Mic Packs & Bundles',
  parent.category_id,
  3,
  '/microphones-wireless/studio-microphones/mic-packs-bundles',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/studio-microphones';

-- 6.2.1 Vocal & Instrument Dynamics (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Vocal & Instrument Dynamics',
  parent.category_id,
  3,
  '/microphones-wireless/live-microphones/vocal-instrument-dynamics',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/live-microphones';

-- 6.2.2 Drum & Instrument Mic Packs/Bundles (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Drum & Instrument Mic Packs/Bundles',
  parent.category_id,
  3,
  '/microphones-wireless/live-microphones/drum-instrument-mic-packsbundles',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/live-microphones';

-- 6.2.3 Installed & Paging Mics (Gooseneck/Boundary) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Installed & Paging Mics (Gooseneck/Boundary)',
  parent.category_id,
  3,
  '/microphones-wireless/live-microphones/installed-paging-mics-gooseneckboundary',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/live-microphones';

-- 6.3.1 Handheld Systems (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Handheld Systems',
  parent.category_id,
  3,
  '/microphones-wireless/wireless-systems/handheld-systems',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/wireless-systems';

-- 6.3.2 Lavalier & Headset Systems (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Lavalier & Headset Systems',
  parent.category_id,
  3,
  '/microphones-wireless/wireless-systems/lavalier-headset-systems',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/wireless-systems';

-- 6.3.3 Instrument Wireless (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Instrument Wireless',
  parent.category_id,
  3,
  '/microphones-wireless/wireless-systems/instrument-wireless',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/wireless-systems';

-- 6.3.4 In-Ear Monitor Systems (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'In-Ear Monitor Systems',
  parent.category_id,
  3,
  '/microphones-wireless/wireless-systems/in-ear-monitor-systems',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/wireless-systems';

-- 6.3.5 Antenna Distribution & Accessories (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Antenna Distribution & Accessories',
  parent.category_id,
  3,
  '/microphones-wireless/wireless-systems/antenna-distribution-accessories',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/microphones-wireless/wireless-systems';

-- 7.1.1 Portable PA Systems (All-in-One Column Systems/Small PA Packages: Speaker + Mixer) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Portable PA Systems (All-in-One Column Systems/Small PA Packages: Speaker + Mixer)',
  parent.category_id,
  3,
  '/live-sound-pa/pa-systems-loudspeakers/portable-pa-systems-all-in-one-column-systemssmall-pa-packages-speaker-mixer',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/pa-systems-loudspeakers';

-- 7.1.2 Full-Range Speakers (Active/Powered: 8–10"/12–15"+/Passive) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Full-Range Speakers (Active/Powered: 8–10"/12–15"+/Passive)',
  parent.category_id,
  3,
  '/live-sound-pa/pa-systems-loudspeakers/full-range-speakers-activepowered-8101215passive',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/pa-systems-loudspeakers';

-- 7.1.3 Subwoofers (Active/Passive) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Subwoofers (Active/Passive)',
  parent.category_id,
  3,
  '/live-sound-pa/pa-systems-loudspeakers/subwoofers-activepassive',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/pa-systems-loudspeakers';

-- 7.1.4 Installed Speakers (Ceiling/Wall/Column/Horn) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Installed Speakers (Ceiling/Wall/Column/Horn)',
  parent.category_id,
  3,
  '/live-sound-pa/pa-systems-loudspeakers/installed-speakers-ceilingwallcolumnhorn',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/pa-systems-loudspeakers';

-- 7.2.1 Analog Mixers (Compact: 2–12 Channels/Medium/Large) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Analog Mixers (Compact: 2–12 Channels/Medium/Large)',
  parent.category_id,
  3,
  '/live-sound-pa/mixing-consoles/analog-mixers-compact-212-channelsmediumlarge',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/mixing-consoles';

-- 7.2.2 Digital Mixers (Rack/Stagebox Mixers/Surface + Stagebox Systems) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Digital Mixers (Rack/Stagebox Mixers/Surface + Stagebox Systems)',
  parent.category_id,
  3,
  '/live-sound-pa/mixing-consoles/digital-mixers-rackstagebox-mixerssurface-stagebox-systems',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/mixing-consoles';

-- 7.2.3 Powered Mixers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Powered Mixers',
  parent.category_id,
  3,
  '/live-sound-pa/mixing-consoles/powered-mixers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/mixing-consoles';

-- 7.3.1 PA Controllers & DSP (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'PA Controllers & DSP',
  parent.category_id,
  3,
  '/live-sound-pa/signal-processing-system-management/pa-controllers-dsp',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/signal-processing-system-management';

-- 7.3.2 Graphic & Parametric EQ (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Graphic & Parametric EQ',
  parent.category_id,
  3,
  '/live-sound-pa/signal-processing-system-management/graphic-parametric-eq',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/signal-processing-system-management';

-- 7.3.3 Crossovers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Crossovers',
  parent.category_id,
  3,
  '/live-sound-pa/signal-processing-system-management/crossovers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/signal-processing-system-management';

-- 7.3.4 Feedback Suppressors & Auto Mixers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Feedback Suppressors & Auto Mixers',
  parent.category_id,
  3,
  '/live-sound-pa/signal-processing-system-management/feedback-suppressors-auto-mixers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/signal-processing-system-management';

-- 7.4.1 Paging Amplifiers & Mixers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Paging Amplifiers & Mixers',
  parent.category_id,
  3,
  '/live-sound-pa/public-address-100v-line/paging-amplifiers-mixers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/public-address-100v-line';

-- 7.4.2 100V Speakers (Ceiling/Wall/Horn/Column) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  '100V Speakers (Ceiling/Wall/Horn/Column)',
  parent.category_id,
  3,
  '/live-sound-pa/public-address-100v-line/100v-speakers-ceilingwallhorncolumn',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/public-address-100v-line';

-- 7.4.3 Zone Mixers & Routers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Zone Mixers & Routers',
  parent.category_id,
  3,
  '/live-sound-pa/public-address-100v-line/zone-mixers-routers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/public-address-100v-line';

-- 7.4.4 Evac & Voice Alarm (if applicable) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Evac & Voice Alarm (if applicable)',
  parent.category_id,
  3,
  '/live-sound-pa/public-address-100v-line/evac-voice-alarm-if-applicable',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/public-address-100v-line';

-- 7.5.1 Speaker Stands & Poles (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Speaker Stands & Poles',
  parent.category_id,
  3,
  '/live-sound-pa/live-sound-accessories/speaker-stands-poles',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/live-sound-accessories';

-- 7.5.2 Mic Stands & Clips (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Mic Stands & Clips',
  parent.category_id,
  3,
  '/live-sound-pa/live-sound-accessories/mic-stands-clips',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/live-sound-accessories';

-- 7.5.3 Flight Cases & Bags (Speakers/Mixers/Racks) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Flight Cases & Bags (Speakers/Mixers/Racks)',
  parent.category_id,
  3,
  '/live-sound-pa/live-sound-accessories/flight-cases-bags-speakersmixersracks',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/live-sound-accessories';

-- 7.5.4 DI Boxes (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DI Boxes',
  parent.category_id,
  3,
  '/live-sound-pa/live-sound-accessories/di-boxes',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/live-sound-accessories';

-- 7.5.5 Stage Snakes & Multicores (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Stage Snakes & Multicores',
  parent.category_id,
  3,
  '/live-sound-pa/live-sound-accessories/stage-snakes-multicores',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/live-sound-pa/live-sound-accessories';

-- 8.1.1 Media Players (Standalone) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Media Players (Standalone)',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-players-controllers/media-players-standalone',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-players-controllers';

-- 8.1.2 DJ Controllers (Laptop/Software) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DJ Controllers (Laptop/Software)',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-players-controllers/dj-controllers-laptopsoftware',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-players-controllers';

-- 8.1.3 All-in-One DJ Systems (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'All-in-One DJ Systems',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-players-controllers/all-in-one-dj-systems',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-players-controllers';

-- 8.2.1 2-Channel Mixers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  '2-Channel Mixers',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-mixers/2-channel-mixers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-mixers';

-- 8.2.2 4-Channel & Club Mixers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  '4-Channel & Club Mixers',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-mixers/4-channel-club-mixers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-mixers';

-- 8.2.3 Scratch/Battle Mixers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Scratch/Battle Mixers',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-mixers/scratchbattle-mixers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-mixers';

-- 8.3.1 DJ Turntables (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DJ Turntables',
  parent.category_id,
  3,
  '/dj-electronic-music/turntables-cartridges/dj-turntables',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/turntables-cartridges';

-- 8.3.2 Hi-Fi Turntables (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Hi-Fi Turntables',
  parent.category_id,
  3,
  '/dj-electronic-music/turntables-cartridges/hi-fi-turntables',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/turntables-cartridges';

-- 8.3.3 Cartridges & Styli (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Cartridges & Styli',
  parent.category_id,
  3,
  '/dj-electronic-music/turntables-cartridges/cartridges-styli',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/turntables-cartridges';

-- 8.4.1 DJ Headphones (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DJ Headphones',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-monitoring-pa/dj-headphones',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-monitoring-pa';

-- 8.4.2 Booth Monitors (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Booth Monitors',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-monitoring-pa/booth-monitors',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-monitoring-pa';

-- 8.4.3 Compact DJ PA Systems (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Compact DJ PA Systems',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-monitoring-pa/compact-dj-pa-systems',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-monitoring-pa';

-- 8.5.1 FX Units & Samplers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'FX Units & Samplers',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-effects-accessories/fx-units-samplers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-effects-accessories';

-- 8.5.2 Laptop Stands (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Laptop Stands',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-effects-accessories/laptop-stands',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-effects-accessories';

-- 8.5.3 Controller Cases & Bags (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Controller Cases & Bags',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-effects-accessories/controller-cases-bags',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-effects-accessories';

-- 8.5.4 Slipmats, Faders & Spare Parts (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Slipmats, Faders & Spare Parts',
  parent.category_id,
  3,
  '/dj-electronic-music/dj-effects-accessories/slipmats-faders-spare-parts',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/dj-electronic-music/dj-effects-accessories';

-- 9.1.1 PAR & Wash Lights (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'PAR & Wash Lights',
  parent.category_id,
  3,
  '/lighting-stage-effects/entertainment-lighting-fixtures/par-wash-lights',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/entertainment-lighting-fixtures';

-- 9.1.2 Spot & Profile Fixtures (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Spot & Profile Fixtures',
  parent.category_id,
  3,
  '/lighting-stage-effects/entertainment-lighting-fixtures/spot-profile-fixtures',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/entertainment-lighting-fixtures';

-- 9.1.3 Moving Heads (Spot/Wash/Beam/Hybrid) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Moving Heads (Spot/Wash/Beam/Hybrid)',
  parent.category_id,
  3,
  '/lighting-stage-effects/entertainment-lighting-fixtures/moving-heads-spotwashbeamhybrid',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/entertainment-lighting-fixtures';

-- 9.1.4 LED Bars & Strip Fixtures (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'LED Bars & Strip Fixtures',
  parent.category_id,
  3,
  '/lighting-stage-effects/entertainment-lighting-fixtures/led-bars-strip-fixtures',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/entertainment-lighting-fixtures';

-- 9.1.5 UV, Strobe & Blacklight (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'UV, Strobe & Blacklight',
  parent.category_id,
  3,
  '/lighting-stage-effects/entertainment-lighting-fixtures/uv-strobe-blacklight',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/entertainment-lighting-fixtures';

-- 9.2.1 LED Fixtures (Indoor/Outdoor) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'LED Fixtures (Indoor/Outdoor)',
  parent.category_id,
  3,
  '/lighting-stage-effects/architectural-install-lighting/led-fixtures-indooroutdoor',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/architectural-install-lighting';

-- 9.2.2 Wall Washers & Linear Fixtures (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Wall Washers & Linear Fixtures',
  parent.category_id,
  3,
  '/lighting-stage-effects/architectural-install-lighting/wall-washers-linear-fixtures',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/architectural-install-lighting';

-- 9.2.3 Downlights & Accent Fixtures (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Downlights & Accent Fixtures',
  parent.category_id,
  3,
  '/lighting-stage-effects/architectural-install-lighting/downlights-accent-fixtures',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/architectural-install-lighting';

-- 9.3.1 DMX Controllers & Consoles (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DMX Controllers & Consoles',
  parent.category_id,
  3,
  '/lighting-stage-effects/control-dimming/dmx-controllers-consoles',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/control-dimming';

-- 9.3.2 DMX Splitters, Nodes & Interfaces (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DMX Splitters, Nodes & Interfaces',
  parent.category_id,
  3,
  '/lighting-stage-effects/control-dimming/dmx-splitters-nodes-interfaces',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/control-dimming';

-- 9.3.3 Dimmers & Relay Packs (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Dimmers & Relay Packs',
  parent.category_id,
  3,
  '/lighting-stage-effects/control-dimming/dimmers-relay-packs',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/control-dimming';

-- 9.4.1 Fog & Smoke Machines (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Fog & Smoke Machines',
  parent.category_id,
  3,
  '/lighting-stage-effects/effects-machines/fog-smoke-machines',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/effects-machines';

-- 9.4.2 Haze Machines (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Haze Machines',
  parent.category_id,
  3,
  '/lighting-stage-effects/effects-machines/haze-machines',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/effects-machines';

-- 9.4.3 Bubble & Snow Machines (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Bubble & Snow Machines',
  parent.category_id,
  3,
  '/lighting-stage-effects/effects-machines/bubble-snow-machines',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/effects-machines';

-- 9.4.4 Fluids & Consumables (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Fluids & Consumables',
  parent.category_id,
  3,
  '/lighting-stage-effects/effects-machines/fluids-consumables',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/effects-machines';

-- 9.5.1 Truss (Box/Ladder) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Truss (Box/Ladder)',
  parent.category_id,
  3,
  '/lighting-stage-effects/truss-staging-rigging/truss-boxladder',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/truss-staging-rigging';

-- 9.5.2 Stage Platforms & Risers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Stage Platforms & Risers',
  parent.category_id,
  3,
  '/lighting-stage-effects/truss-staging-rigging/stage-platforms-risers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/truss-staging-rigging';

-- 9.5.3 Lifting Systems (Wind-Ups/Cranks/Hoists) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Lifting Systems (Wind-Ups/Cranks/Hoists)',
  parent.category_id,
  3,
  '/lighting-stage-effects/truss-staging-rigging/lifting-systems-wind-upscrankshoists',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/truss-staging-rigging';

-- 9.5.4 Clamps, Couplers & Rigging Hardware (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Clamps, Couplers & Rigging Hardware',
  parent.category_id,
  3,
  '/lighting-stage-effects/truss-staging-rigging/clamps-couplers-rigging-hardware',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/truss-staging-rigging';

-- 9.6.1 Lighting Stands & T-Bars (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Lighting Stands & T-Bars',
  parent.category_id,
  3,
  '/lighting-stage-effects/stands-support/lighting-stands-t-bars',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/stands-support';

-- 9.6.2 Speaker Stands (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Speaker Stands',
  parent.category_id,
  3,
  '/lighting-stage-effects/stands-support/speaker-stands',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/stands-support';

-- 9.6.3 TV & Screen Mounts/Brackets (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'TV & Screen Mounts/Brackets',
  parent.category_id,
  3,
  '/lighting-stage-effects/stands-support/tv-screen-mountsbrackets',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/lighting-stage-effects/stands-support';

-- 11.1.1 Projectors (Business/Education/Cinema) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Projectors (Business/Education/Cinema)',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/projectors-screens/projectors-businesseducationcinema',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/projectors-screens';

-- 11.1.2 Projection Screens (Fixed Frame/Manual/Electric Pull-Down/Portable/Tripod) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Projection Screens (Fixed Frame/Manual/Electric Pull-Down/Portable/Tripod)',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/projectors-screens/projection-screens-fixed-framemanualelectric-pull-downportabletripod',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/projectors-screens';

-- 11.2.1 Professional & Commercial Displays (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Professional & Commercial Displays',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/displays-mounting/professional-commercial-displays',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/displays-mounting';

-- 11.2.2 Video Walls & LED Panels (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Video Walls & LED Panels',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/displays-mounting/video-walls-led-panels',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/displays-mounting';

-- 11.2.3 TV & Display Mounts (Fixed/Tilt/Full Motion/Articulating) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'TV & Display Mounts (Fixed/Tilt/Full Motion/Articulating)',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/displays-mounting/tv-display-mounts-fixedtiltfull-motionarticulating',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/displays-mounting';

-- 11.3.1 Conference Microphones & Boundary Mics (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Conference Microphones & Boundary Mics',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/conferencing-collaboration/conference-microphones-boundary-mics',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/conferencing-collaboration';

-- 11.3.2 USB & Network Conferencing Bars (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'USB & Network Conferencing Bars',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/conferencing-collaboration/usb-network-conferencing-bars',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/conferencing-collaboration';

-- 11.3.3 Speakerphones & Meeting Room Systems (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Speakerphones & Meeting Room Systems',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/conferencing-collaboration/speakerphones-meeting-room-systems',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/conferencing-collaboration';

-- 11.3.4 Lecture Capture & Streaming Devices (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Lecture Capture & Streaming Devices',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/conferencing-collaboration/lecture-capture-streaming-devices',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/conferencing-collaboration';

-- 11.4.1 Switchers & Matrix Switchers (HDMI/SDI/AVoIP) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Switchers & Matrix Switchers (HDMI/SDI/AVoIP)',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/signal-management-distribution/switchers-matrix-switchers-hdmisdiavoip',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/signal-management-distribution';

-- 11.4.2 Extenders & Splitters (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Extenders & Splitters',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/signal-management-distribution/extenders-splitters',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/signal-management-distribution';

-- 11.4.3 Scalers & Converters (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Scalers & Converters',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/signal-management-distribution/scalers-converters',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/signal-management-distribution';

-- 11.4.4 Control Systems & Touch Panels (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Control Systems & Touch Panels',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/signal-management-distribution/control-systems-touch-panels',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/signal-management-distribution';

-- 11.5.1 Ceiling Speakers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Ceiling Speakers',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/installed-audio/ceiling-speakers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/installed-audio';

-- 11.5.2 Wall Speakers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Wall Speakers',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/installed-audio/wall-speakers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/installed-audio';

-- 11.5.3 Column & Line Array Install Speakers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Column & Line Array Install Speakers',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/installed-audio/column-line-array-install-speakers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/installed-audio';

-- 11.5.4 Installed Amplifiers & DSP (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Installed Amplifiers & DSP',
  parent.category_id,
  3,
  '/installed-av-conferencing-video/installed-audio/installed-amplifiers-dsp',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/installed-av-conferencing-video/installed-audio';

-- 12.1.1 Amplifiers & Receivers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Amplifiers & Receivers',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/home-hi-fi-components/amplifiers-receivers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/home-hi-fi-components';

-- 12.1.2 CD/Media Players (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'CD/Media Players',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/home-hi-fi-components/cdmedia-players',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/home-hi-fi-components';

-- 12.1.3 Tuners & Network Streamers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Tuners & Network Streamers',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/home-hi-fi-components/tuners-network-streamers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/home-hi-fi-components';

-- 12.2.1 Stereo Speakers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Stereo Speakers',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/speaker-systems/stereo-speakers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/speaker-systems';

-- 12.2.2 Home Theatre Systems & Soundbars (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Home Theatre Systems & Soundbars',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/speaker-systems/home-theatre-systems-soundbars',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/speaker-systems';

-- 12.2.3 Subwoofers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Subwoofers',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/speaker-systems/subwoofers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/speaker-systems';

-- 12.3.1 Over-Ear & On-Ear (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Over-Ear & On-Ear',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/headphones-earphones-consumer/over-ear-on-ear',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/headphones-earphones-consumer';

-- 12.3.2 In-Ear/Earbuds (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'In-Ear/Earbuds',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/headphones-earphones-consumer/in-earearbuds',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/headphones-earphones-consumer';

-- 12.3.3 True Wireless & Bluetooth (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'True Wireless & Bluetooth',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/headphones-earphones-consumer/true-wireless-bluetooth',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/headphones-earphones-consumer';

-- 12.4.1 Compact Portable (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Compact Portable',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/portable-bluetooth-speakers/compact-portable',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/portable-bluetooth-speakers';

-- 12.4.2 Rugged/Outdoor (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Rugged/Outdoor',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/portable-bluetooth-speakers/ruggedoutdoor',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/portable-bluetooth-speakers';

-- 12.4.3 Party & High-Power Speakers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Party & High-Power Speakers',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/portable-bluetooth-speakers/party-high-power-speakers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/portable-bluetooth-speakers';

-- 12.5.1 MP3/Media Players (if applicable) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'MP3/Media Players (if applicable)',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/personal-audio-accessories/mp3media-players-if-applicable',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/personal-audio-accessories';

-- 12.5.2 Docking Stations & Cradles (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Docking Stations & Cradles',
  parent.category_id,
  3,
  '/consumer-audio-hi-fi-portable/personal-audio-accessories/docking-stations-cradles',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/consumer-audio-hi-fi-portable/personal-audio-accessories';

-- 13.1.1 Microphone Cables (XLR/XLR, XLR/Jack) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Microphone Cables (XLR/XLR, XLR/Jack)',
  parent.category_id,
  3,
  '/cables-connectors-power/audio-cables/microphone-cables-xlrxlr-xlrjack',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/audio-cables';

-- 13.1.2 Instrument Cables (Guitar/TS) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Instrument Cables (Guitar/TS)',
  parent.category_id,
  3,
  '/cables-connectors-power/audio-cables/instrument-cables-guitarts',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/audio-cables';

-- 13.1.3 Speaker Cables (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Speaker Cables',
  parent.category_id,
  3,
  '/cables-connectors-power/audio-cables/speaker-cables',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/audio-cables';

-- 13.1.4 Insert, Patch & Y-Cables (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Insert, Patch & Y-Cables',
  parent.category_id,
  3,
  '/cables-connectors-power/audio-cables/insert-patch-y-cables',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/audio-cables';

-- 13.2.1 MIDI & USB (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'MIDI & USB',
  parent.category_id,
  3,
  '/cables-connectors-power/data-digital-cables/midi-usb',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/data-digital-cables';

-- 13.2.2 Network (CAT5/6/7) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Network (CAT5/6/7)',
  parent.category_id,
  3,
  '/cables-connectors-power/data-digital-cables/network-cat567',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/data-digital-cables';

-- 13.2.3 Digital Audio (AES/EBU, SPDIF, ADAT) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Digital Audio (AES/EBU, SPDIF, ADAT)',
  parent.category_id,
  3,
  '/cables-connectors-power/data-digital-cables/digital-audio-aesebu-spdif-adat',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/data-digital-cables';

-- 13.3.1 HDMI/DisplayPort (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'HDMI/DisplayPort',
  parent.category_id,
  3,
  '/cables-connectors-power/video-av-cables/hdmidisplayport',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/video-av-cables';

-- 13.3.2 VGA & Legacy Video (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'VGA & Legacy Video',
  parent.category_id,
  3,
  '/cables-connectors-power/video-av-cables/vga-legacy-video',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/video-av-cables';

-- 13.3.3 SDI & Coax Video (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'SDI & Coax Video',
  parent.category_id,
  3,
  '/cables-connectors-power/video-av-cables/sdi-coax-video',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/video-av-cables';

-- 13.4.1 IEC & Mains Leads (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'IEC & Mains Leads',
  parent.category_id,
  3,
  '/cables-connectors-power/power-cables-distribution/iec-mains-leads',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/power-cables-distribution';

-- 13.4.2 Power Strips & Conditioners (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Power Strips & Conditioners',
  parent.category_id,
  3,
  '/cables-connectors-power/power-cables-distribution/power-strips-conditioners',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/power-cables-distribution';

-- 13.4.3 PowerCON & Locking Connectors (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'PowerCON & Locking Connectors',
  parent.category_id,
  3,
  '/cables-connectors-power/power-cables-distribution/powercon-locking-connectors',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/power-cables-distribution';

-- 13.5.1 Audio Connectors (XLR/Jack/SpeakON/RCA) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Audio Connectors (XLR/Jack/SpeakON/RCA)',
  parent.category_id,
  3,
  '/cables-connectors-power/connectors-bulk-cable/audio-connectors-xlrjackspeakonrca',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/connectors-bulk-cable';

-- 13.5.2 Power & PowerCON Connectors (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Power & PowerCON Connectors',
  parent.category_id,
  3,
  '/cables-connectors-power/connectors-bulk-cable/power-powercon-connectors',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/connectors-bulk-cable';

-- 13.5.3 Bulk Audio/Speaker/Data Cable (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Bulk Audio/Speaker/Data Cable',
  parent.category_id,
  3,
  '/cables-connectors-power/connectors-bulk-cable/bulk-audiospeakerdata-cable',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/cables-connectors-power/connectors-bulk-cable';

-- 14.1.1 Guitar (Strings/Picks/Capos/Slides) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Guitar (Strings/Picks/Capos/Slides)',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/instrument-accessories/guitar-stringspickscaposslides',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/instrument-accessories';

-- 14.1.2 Drum (Sticks/Drumkeys/Practice Pads) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Drum (Sticks/Drumkeys/Practice Pads)',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/instrument-accessories/drum-sticksdrumkeyspractice-pads',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/instrument-accessories';

-- 14.1.3 Keyboard (Covers/Pedals/Benches) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Keyboard (Covers/Pedals/Benches)',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/instrument-accessories/keyboard-coverspedalsbenches',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/instrument-accessories';

-- 14.1.4 Orchestral & Band Accessories (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Orchestral & Band Accessories',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/instrument-accessories/orchestral-band-accessories',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/instrument-accessories';

-- 14.2.1 Instrument Cases & Bags (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Instrument Cases & Bags',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/cases-bags/instrument-cases-bags',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/cases-bags';

-- 14.2.2 Mixer & Rack Cases (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Mixer & Rack Cases',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/cases-bags/mixer-rack-cases',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/cases-bags';

-- 14.2.3 Speaker & Monitor Covers (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Speaker & Monitor Covers',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/cases-bags/speaker-monitor-covers',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/cases-bags';

-- 14.2.4 DJ & Controller Cases (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'DJ & Controller Cases',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/cases-bags/dj-controller-cases',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/cases-bags';

-- 14.3.1 Rack Cabinets & Flightcases (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Rack Cabinets & Flightcases',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/racks-rack-accessories/rack-cabinets-flightcases',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/racks-rack-accessories';

-- 14.3.2 Rack Shelves, Panels & Hardware (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Rack Shelves, Panels & Hardware',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/racks-rack-accessories/rack-shelves-panels-hardware',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/racks-rack-accessories';

-- 14.3.3 Rack Power & Cooling (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Rack Power & Cooling',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/racks-rack-accessories/rack-power-cooling',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/racks-rack-accessories';

-- 14.4.1 Instrument Stands (Guitar/Keyboard) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Instrument Stands (Guitar/Keyboard)',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/stands-mounts-general/instrument-stands-guitarkeyboard',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/stands-mounts-general';

-- 14.4.2 Microphone Stands & Booms (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Microphone Stands & Booms',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/stands-mounts-general/microphone-stands-booms',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/stands-mounts-general';

-- 14.4.3 Music Stands & Conductor Stands (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Music Stands & Conductor Stands',
  parent.category_id,
  3,
  '/accessories-cases-racks-stands/stands-mounts-general/music-stands-conductor-stands',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/accessories-cases-racks-stands/stands-mounts-general';

-- 15.1.1 Replacement Drivers & HF Units (Woofers/Tweeters/Horns) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Replacement Drivers & HF Units (Woofers/Tweeters/Horns)',
  parent.category_id,
  3,
  '/spares-components-consumables/electronic-spares/replacement-drivers-hf-units-wooferstweetershorns',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/electronic-spares';

-- 15.1.2 Faders, Pots & Switches (Sliders/Knobs/Encoders) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Faders, Pots & Switches (Sliders/Knobs/Encoders)',
  parent.category_id,
  3,
  '/spares-components-consumables/electronic-spares/faders-pots-switches-slidersknobsencoders',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/electronic-spares';

-- 15.1.3 Power Supplies & Modules (Adapters/Transformers/PSU Boards) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Power Supplies & Modules (Adapters/Transformers/PSU Boards)',
  parent.category_id,
  3,
  '/spares-components-consumables/electronic-spares/power-supplies-modules-adapterstransformerspsu-boards',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/electronic-spares';

-- 15.1.4 Circuit Boards & Assemblies (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Circuit Boards & Assemblies',
  parent.category_id,
  3,
  '/spares-components-consumables/electronic-spares/circuit-boards-assemblies',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/electronic-spares';

-- 15.2.1 Guitar Parts (Bridges/Tuners/Nuts/Pickguards) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Guitar Parts (Bridges/Tuners/Nuts/Pickguards)',
  parent.category_id,
  3,
  '/spares-components-consumables/instrument-spares/guitar-parts-bridgestunersnutspickguards',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/instrument-spares';

-- 15.2.2 Drum Parts (Lugs/Hoops/Pedal Assemblies) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Drum Parts (Lugs/Hoops/Pedal Assemblies)',
  parent.category_id,
  3,
  '/spares-components-consumables/instrument-spares/drum-parts-lugshoopspedal-assemblies',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/instrument-spares';

-- 15.2.3 Keyboard & Digital Piano Parts (Keys/Controllers/Displays) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Keyboard & Digital Piano Parts (Keys/Controllers/Displays)',
  parent.category_id,
  3,
  '/spares-components-consumables/instrument-spares/keyboard-digital-piano-parts-keyscontrollersdisplays',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/instrument-spares';

-- 15.3.1 Lamps, LEDs & Control Boards (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Lamps, LEDs & Control Boards',
  parent.category_id,
  3,
  '/spares-components-consumables/lighting-rigging-spares/lamps-leds-control-boards',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/lighting-rigging-spares';

-- 15.3.2 Clamps, Bolts & Rigging Hardware (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Clamps, Bolts & Rigging Hardware',
  parent.category_id,
  3,
  '/spares-components-consumables/lighting-rigging-spares/clamps-bolts-rigging-hardware',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/lighting-rigging-spares';

-- 15.4.1 Cleaning Products & Polishes (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Cleaning Products & Polishes',
  parent.category_id,
  3,
  '/spares-components-consumables/maintenance-care/cleaning-products-polishes',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/maintenance-care';

-- 15.4.2 Lubricants & Contact Cleaners (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Lubricants & Contact Cleaners',
  parent.category_id,
  3,
  '/spares-components-consumables/maintenance-care/lubricants-contact-cleaners',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/maintenance-care';

-- 15.4.3 Tools & Testers (Multimeters/Soldering Kits) (Level 3)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Tools & Testers (Multimeters/Soldering Kits)',
  parent.category_id,
  3,
  '/spares-components-consumables/maintenance-care/tools-testers-multimeterssoldering-kits',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/maintenance-care';

-- 15.1.4.1 Amp & Pre-Amp Boards (Complete Replacements/Speaker-Specific) (Level 4)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Amp & Pre-Amp Boards (Complete Replacements/Speaker-Specific)',
  parent.category_id,
  4,
  '/spares-components-consumables/electronic-spares/circuit-boards-assemblies/amp-pre-amp-boards-complete-replacementsspeaker-specific',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/electronic-spares/circuit-boards-assemblies';

-- 15.1.4.2 Mixer & Console PCBs (Level 4)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Mixer & Console PCBs',
  parent.category_id,
  4,
  '/spares-components-consumables/electronic-spares/circuit-boards-assemblies/mixer-console-pcbs',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/electronic-spares/circuit-boards-assemblies';

-- 15.1.4.3 Brand-Specific Boards (Pioneer/Yamaha/Sennheiser/etc.) (Level 4)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Brand-Specific Boards (Pioneer/Yamaha/Sennheiser/etc.)',
  parent.category_id,
  4,
  '/spares-components-consumables/electronic-spares/circuit-boards-assemblies/brand-specific-boards-pioneeryamahasennheiseretc',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/electronic-spares/circuit-boards-assemblies';

-- 15.1.4.4 Bundles & Kits (Board + Tools/Connectors) (Level 4)
INSERT INTO core.category (category_id, name, parent_id, level, path, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Bundles & Kits (Board + Tools/Connectors)',
  parent.category_id,
  4,
  '/spares-components-consumables/electronic-spares/circuit-boards-assemblies/bundles-kits-board-toolsconnectors',
  true,
  NOW(),
  NOW()
FROM core.category parent
WHERE parent.path = '/spares-components-consumables/electronic-spares/circuit-boards-assemblies';

COMMIT;

-- Migration complete
-- Total categories created: 292


COMMIT;