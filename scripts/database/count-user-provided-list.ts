#!/usr/bin/env bun

const categoryList = `1. Guitars, Basses & Amps
1.1 Electric Guitars
1.1.1 Solid-Body (Standard/Extended Range)
1.1.2 Semi/Full Hollow (Semi-Hollow/Jazz)
1.2 Acoustic/Electro-Acoustic Guitars
1.2.1 Steel-String (Dreadnought/Jumbo/Parlor/Travel)
1.2.2 Nylon/Classical (Full-Size/Reduced Size)
1.3 Basses
1.3.1 Electric Bass (4-String/5+ String)
1.3.2 Acoustic Bass
1.4 Guitar & Bass Packs
1.4.1 Starter Packs
1.4.2 Performance Packs
1.5 Guitar Amplifiers
1.5.1 Combo Amps (Solid-State/Tube)
1.5.2 Amp Heads
1.5.3 Cabinets
1.6 Bass Amplifiers
1.6.1 Combo
1.6.2 Heads & Cabs
1.7 Pedals & Multi-FX
1.7.1 Drive & Distortion
1.7.2 Modulation & Time-Based
1.7.3 Multi-FX & Modelers
1.7.4 Pedalboard Power & Controllers
2. Drums & Percussion
2.1 Acoustic Drums
2.1.1 Shell Packs
2.1.2 Snare Drums
2.1.3 Individual Toms & Kicks
2.2 Cymbals
2.2.1 Sets
2.2.2 Individual (Ride/Crash/Hi-Hat/FX)
2.3 Electronic Drums
2.3.1 Full Kits
2.3.2 Pads & Triggers
2.3.3 Drum Modules
2.4 Percussion
2.4.1 Hand Percussion (Cajon/Bongos/Congas)
2.4.2 Orchestral/Band Percussion
2.4.3 Small Percussion (Shakers/Tambourines)
2.5 Drum Hardware & Accessories
2.5.1 Stands & Pedals
2.5.2 Drumheads
2.5.3 Cases & Bags
3. Keyboards, Pianos & Synths
3.1 Digital Pianos
3.1.1 Console/Home
3.1.2 Stage Pianos
3.2 Synthesizers & Workstations
3.2.1 Performance Synths
3.2.2 Workstations
3.3 Portable Keyboards & Arrangers
3.4 MIDI Controllers & Pad Controllers
3.5 Keyboard Accessories
3.5.1 Stands & Benches
3.5.2 Pedals & Expression
3.5.3 Cases & Bags
4. Orchestral, Band & Folk
4.1 Orchestral Strings (Violin/Viola/Cello/Double Bass)
4.2 Brass & Woodwind
4.3 Folk & Traditional (Ukulele/Mandolin/Banjo)
4.4 Educational Packs & Classroom Instruments
5. Studio, Recording & Production
5.1 Audio Interfaces & Converters
5.1.1 Desktop Interfaces
5.1.2 Rackmount Interfaces
5.1.3 Digital Converters & Clocks
5.2 Studio Monitors & Headphones
5.2.1 Nearfield & Midfield Monitors (Active/Passive)
5.2.2 Subwoofers
5.2.3 Studio Headphones (Closed-Back/Open/Semi-Open)
5.2.4 In-Ear Monitoring (Studio & Stage)
5.3 Outboard & Signal Processing
5.3.1 Preamps & Channel Strips
5.3.2 Compressors & Limiters
5.3.3 EQ & Filters
5.3.4 Multi-FX & Reverb Units
5.3.5 Monitor Controllers & Headphone Amps
5.4 Recording Tools & Controllers
5.4.1 DAW Controllers & Control Surfaces
5.4.2 MIDI Keyboards & Pad Controllers (Studio)
5.4.3 Studio Computers / Audio PCs (if applicable)
5.5 Studio Furniture & Acoustic Treatment
5.5.1 Studio Desks & Racks
5.5.2 Monitor Stands
5.5.3 Acoustic Panels & Bass Traps
5.5.4 Vocal Booths & Reflection Filters
6. Microphones & Wireless
6.1 Studio Microphones
6.1.1 Condenser Mics (Large Diaphragm/Small Diaphragm)
6.1.2 Dynamic Mics
6.1.3 Ribbon Mics
6.1.4 USB & Podcast Mics
6.1.5 Mic Packs & Bundles
6.2 Live Microphones
6.2.1 Vocal & Instrument Dynamics
6.2.2 Drum & Instrument Mic Packs/Bundles
6.2.3 Installed & Paging Mics (Gooseneck/Boundary)
6.3 Wireless Systems
6.3.1 Handheld Systems
6.3.2 Lavalier & Headset Systems
6.3.3 Instrument Wireless
6.3.4 In-Ear Monitor Systems
6.3.5 Antenna Distribution & Accessories
7. Live Sound & PA
7.1 PA Systems & Loudspeakers
7.1.1 Portable PA Systems (All-in-One Column Systems/Small PA Packages: Speaker + Mixer)
7.1.2 Full-Range Speakers (Active/Powered: 8–10"/12–15"+/Passive)
7.1.3 Subwoofers (Active/Passive)
7.1.4 Installed Speakers (Ceiling/Wall/Column/Horn)
7.2 Mixing Consoles
7.2.1 Analog Mixers (Compact: 2–12 Channels/Medium/Large)
7.2.2 Digital Mixers (Rack/Stagebox Mixers/Surface + Stagebox Systems)
7.2.3 Powered Mixers
7.3 Signal Processing & System Management
7.3.1 PA Controllers & DSP
7.3.2 Graphic & Parametric EQ
7.3.3 Crossovers
7.3.4 Feedback Suppressors & Auto Mixers
7.4 Public Address & 100V Line
7.4.1 Paging Amplifiers & Mixers
7.4.2 100V Speakers (Ceiling/Wall/Horn/Column)
7.4.3 Zone Mixers & Routers
7.4.4 Evac & Voice Alarm (if applicable)
7.5 Live Sound Accessories
7.5.1 Speaker Stands & Poles
7.5.2 Mic Stands & Clips
7.5.3 Flight Cases & Bags (Speakers/Mixers/Racks)
7.5.4 DI Boxes
7.5.5 Stage Snakes & Multicores
8. DJ & Electronic Music
8.1 DJ Players & Controllers
8.1.1 Media Players (Standalone)
8.1.2 DJ Controllers (Laptop/Software)
8.1.3 All-in-One DJ Systems
8.2 DJ Mixers
8.2.1 2-Channel Mixers
8.2.2 4-Channel & Club Mixers
8.2.3 Scratch/Battle Mixers
8.3 Turntables & Cartridges
8.3.1 DJ Turntables
8.3.2 Hi-Fi Turntables
8.3.3 Cartridges & Styli
8.4 DJ Monitoring & PA
8.4.1 DJ Headphones
8.4.2 Booth Monitors
8.4.3 Compact DJ PA Systems
8.5 DJ Effects & Accessories
8.5.1 FX Units & Samplers
8.5.2 Laptop Stands
8.5.3 Controller Cases & Bags
8.5.4 Slipmats, Faders & Spare Parts
9. Lighting, Stage & Effects
9.1 Entertainment Lighting Fixtures
9.1.1 PAR & Wash Lights
9.1.2 Spot & Profile Fixtures
9.1.3 Moving Heads (Spot/Wash/Beam/Hybrid)
9.1.4 LED Bars & Strip Fixtures
9.1.5 UV, Strobe & Blacklight
9.2 Architectural & Install Lighting
9.2.1 LED Fixtures (Indoor/Outdoor)
9.2.2 Wall Washers & Linear Fixtures
9.2.3 Downlights & Accent Fixtures
9.3 Control & Dimming
9.3.1 DMX Controllers & Consoles
9.3.2 DMX Splitters, Nodes & Interfaces
9.3.3 Dimmers & Relay Packs
9.4 Effects Machines
9.4.1 Fog & Smoke Machines
9.4.2 Haze Machines
9.4.3 Bubble & Snow Machines
9.4.4 Fluids & Consumables
9.5 Truss, Staging & Rigging
9.5.1 Truss (Box/Ladder)
9.5.2 Stage Platforms & Risers
9.5.3 Lifting Systems (Wind-Ups/Cranks/Hoists)
9.5.4 Clamps, Couplers & Rigging Hardware
9.6 Stands & Support
9.6.1 Lighting Stands & T-Bars
9.6.2 Speaker Stands
9.6.3 TV & Screen Mounts/Brackets
10. Software & Plugins
10.1 DAWs & Editors
10.2 Virtual Instruments
10.3 Effects Plugins
10.4 Utilities (Converters/MIDI Tools)
11. Installed AV, Conferencing & Video
11.1 Projectors & Screens
11.1.1 Projectors (Business/Education/Cinema)
11.1.2 Projection Screens (Fixed Frame/Manual/Electric Pull-Down/Portable/Tripod)
11.2 Displays & Mounting
11.2.1 Professional & Commercial Displays
11.2.2 Video Walls & LED Panels
11.2.3 TV & Display Mounts (Fixed/Tilt/Full Motion/Articulating)
11.3 Conferencing & Collaboration
11.3.1 Conference Microphones & Boundary Mics
11.3.2 USB & Network Conferencing Bars
11.3.3 Speakerphones & Meeting Room Systems
11.3.4 Lecture Capture & Streaming Devices
11.4 Signal Management & Distribution
11.4.1 Switchers & Matrix Switchers (HDMI/SDI/AVoIP)
11.4.2 Extenders & Splitters
11.4.3 Scalers & Converters
11.4.4 Control Systems & Touch Panels
11.5 Installed Audio
11.5.1 Ceiling Speakers
11.5.2 Wall Speakers
11.5.3 Column & Line Array Install Speakers
11.5.4 Installed Amplifiers & DSP
12. Consumer Audio, Hi-Fi & Portable
12.1 Home Hi-Fi Components
12.1.1 Amplifiers & Receivers
12.1.2 CD/Media Players
12.1.3 Tuners & Network Streamers
12.2 Speaker Systems
12.2.1 Stereo Speakers
12.2.2 Home Theatre Systems & Soundbars
12.2.3 Subwoofers
12.3 Headphones & Earphones (Consumer)
12.3.1 Over-Ear & On-Ear
12.3.2 In-Ear/Earbuds
12.3.3 True Wireless & Bluetooth
12.4 Portable & Bluetooth Speakers
12.4.1 Compact Portable
12.4.2 Rugged/Outdoor
12.4.3 Party & High-Power Speakers
12.5 Personal Audio & Accessories
12.5.1 MP3/Media Players (if applicable)
12.5.2 Docking Stations & Cradles
13. Cables, Connectors & Power
13.1 Audio Cables
13.1.1 Microphone Cables (XLR/XLR, XLR/Jack)
13.1.2 Instrument Cables (Guitar/TS)
13.1.3 Speaker Cables
13.1.4 Insert, Patch & Y-Cables
13.2 Data & Digital Cables
13.2.1 MIDI & USB
13.2.2 Network (CAT5/6/7)
13.2.3 Digital Audio (AES/EBU, SPDIF, ADAT)
13.3 Video & AV Cables
13.3.1 HDMI/DisplayPort
13.3.2 VGA & Legacy Video
13.3.3 SDI & Coax Video
13.4 Power Cables & Distribution
13.4.1 IEC & Mains Leads
13.4.2 Power Strips & Conditioners
13.4.3 PowerCON & Locking Connectors
13.5 Connectors & Bulk Cable
13.5.1 Audio Connectors (XLR/Jack/SpeakON/RCA)
13.5.2 Power & PowerCON Connectors
13.5.3 Bulk Audio/Speaker/Data Cable
14. Accessories, Cases, Racks & Stands
14.1 Instrument Accessories
14.1.1 Guitar (Strings/Picks/Capos/Slides)
14.1.2 Drum (Sticks/Drumkeys/Practice Pads)
14.1.3 Keyboard (Covers/Pedals/Benches)
14.1.4 Orchestral & Band Accessories
14.2 Cases & Bags
14.2.1 Instrument Cases & Bags
14.2.2 Mixer & Rack Cases
14.2.3 Speaker & Monitor Covers
14.2.4 DJ & Controller Cases
14.3 Racks & Rack Accessories
14.3.1 Rack Cabinets & Flightcases
14.3.2 Rack Shelves, Panels & Hardware
14.3.3 Rack Power & Cooling
14.4 Stands & Mounts (General)
14.4.1 Instrument Stands (Guitar/Keyboard)
14.4.2 Microphone Stands & Booms
14.4.3 Music Stands & Conductor Stands
15. Spares, Components & Consumables
15.1 Electronic Spares
15.1.1 Replacement Drivers & HF Units (Woofers/Tweeters/Horns)
15.1.2 Faders, Pots & Switches (Sliders/Knobs/Encoders)
15.1.3 Power Supplies & Modules (Adapters/Transformers/PSU Boards)
15.1.4 Circuit Boards & Assemblies
15.1.4.1 Amp & Pre-Amp Boards (Complete Replacements/Speaker-Specific)
15.1.4.2 Mixer & Console PCBs
15.1.4.3 Brand-Specific Boards (Pioneer/Yamaha/Sennheiser/etc.)
15.1.4.4 Bundles & Kits (Board + Tools/Connectors)
15.2 Instrument Spares
15.2.1 Guitar Parts (Bridges/Tuners/Nuts/Pickguards)
15.2.2 Drum Parts (Lugs/Hoops/Pedal Assemblies)
15.2.3 Keyboard & Digital Piano Parts (Keys/Controllers/Displays)
15.3 Lighting & Rigging Spares
15.3.1 Lamps, LEDs & Control Boards
15.3.2 Clamps, Bolts & Rigging Hardware
15.4 Maintenance & Care
15.4.1 Cleaning Products & Polishes
15.4.2 Lubricants & Contact Cleaners
15.4.3 Tools & Testers (Multimeters/Soldering Kits)`;

const lines = categoryList.split('\n').filter((l) => l.trim().length > 0);

const byLevel: Record<number, number> = {};
let total = 0;

lines.forEach((line) => {
  const match = line.match(/^(\d+(?:\.\d+)*)\./);
  if (match) {
    const number = match[1];
    const level = number.split('.').length;
    byLevel[level] = (byLevel[level] || 0) + 1;
    total++;
  }
});

console.log('Category count by level:');
Object.entries(byLevel)
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .forEach(([level, count]) => {
    console.log(`  Level ${level}: ${count}`);
  });

console.log(`\nTotal categories in user-provided list: ${total}`);

import { Client } from 'pg';

const connString =
  process.env.DATABASE_URL ||
  process.env.ENTERPRISE_DATABASE_URL ||
  process.env.NEON_CONNECTION_STRING;

if (connString) {
  const client = new Client({ connectionString: connString });
  await client.connect();
  const result = await client.query('SELECT COUNT(*) as total FROM core.category');
  const dbTotal = parseInt(result.rows[0].total);
  console.log(`\nCategories in database: ${dbTotal}`);
  console.log(`Difference: ${total - dbTotal}`);
  await client.end();
}

