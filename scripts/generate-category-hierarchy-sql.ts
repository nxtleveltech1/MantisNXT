/**
 * Generate SQL migration for comprehensive category hierarchy
 * Parses Categories_Hierachy.md and generates INSERT statements
 */

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-')
    .replace(/&/g, 'and')
    .replace(/\//g, '-')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/\+/g, 'plus')
    .replace(/"/g, '')
    .replace(/'/g, '');
}

interface CategoryNode {
  name: string;
  level: number;
  parentPath?: string;
  children?: CategoryNode[];
}

// Parse the hierarchy structure
const hierarchy: CategoryNode[] = [
  {
    name: 'Musical Instruments',
    level: 1,
    children: [
      {
        name: 'Guitars & Basses',
        level: 2,
        children: [
          {
            name: 'Electric Guitars',
            level: 3,
            children: [
              {
                name: 'Solid-Body',
                level: 4,
                children: [
                  { name: 'Standard (ST/LP/Singlecut etc.)', level: 5 },
                  { name: 'Extended Range (7/8-string)', level: 5 },
                ],
              },
              {
                name: 'Semi-Hollow & Hollow',
                level: 4,
                children: [
                  { name: 'Semi-Hollow', level: 5 },
                  { name: 'Full Hollow / Jazz', level: 5 },
                ],
              },
            ],
          },
          {
            name: 'Acoustic & Electro-Acoustic Guitars',
            level: 3,
            children: [
              {
                name: 'Steel-String',
                level: 4,
                children: [
                  { name: 'Dreadnought / Jumbo', level: 5 },
                  { name: 'Parlor / Travel', level: 5 },
                ],
              },
              {
                name: 'Classical / Nylon',
                level: 4,
                children: [
                  { name: 'Full-size', level: 5 },
                  { name: '3/4 & 1/2 size', level: 5 },
                ],
              },
            ],
          },
          {
            name: 'Basses',
            level: 3,
            children: [
              {
                name: 'Electric Bass',
                level: 4,
                children: [
                  { name: '4-String', level: 5 },
                  { name: '5-String+', level: 5 },
                ],
              },
              { name: 'Acoustic Bass', level: 4 },
            ],
          },
          {
            name: 'Guitar & Bass Packs',
            level: 3,
            children: [
              { name: 'Starter Packs', level: 4 },
              { name: 'Performance Packs', level: 4 },
            ],
          },
        ],
      },
      {
        name: 'Amps & Guitar Electronics',
        level: 2,
        children: [
          {
            name: 'Guitar Amplifiers',
            level: 3,
            children: [
              {
                name: 'Combo Amps',
                level: 4,
                children: [
                  { name: 'Solid-State', level: 5 },
                  { name: 'Tube', level: 5 },
                ],
              },
              { name: 'Amp Heads', level: 4 },
              { name: 'Cabinets', level: 4 },
            ],
          },
          {
            name: 'Bass Amplifiers',
            level: 3,
            children: [
              { name: 'Combo', level: 4 },
              { name: 'Heads & Cabs', level: 4 },
            ],
          },
          {
            name: 'Pedals & Multi-FX',
            level: 3,
            children: [
              { name: 'Drive & Distortion', level: 4 },
              { name: 'Modulation & Time-Based', level: 4 },
              { name: 'Multi-FX & Modelers', level: 4 },
              { name: 'Pedalboard Power & Controllers', level: 4 },
            ],
          },
        ],
      },
      {
        name: 'Drums & Percussion',
        level: 2,
        children: [
          {
            name: 'Acoustic Drums',
            level: 3,
            children: [
              { name: 'Shell Packs', level: 4 },
              { name: 'Snare Drums', level: 4 },
              { name: 'Individual Toms & Kicks', level: 4 },
            ],
          },
          {
            name: 'Cymbals',
            level: 3,
            children: [
              { name: 'Sets', level: 4 },
              { name: 'Individual (Ride/Crash/Hi-Hat/FX)', level: 4 },
            ],
          },
          {
            name: 'Electronic Drums',
            level: 3,
            children: [
              { name: 'Full Kits', level: 4 },
              { name: 'Pads & Triggers', level: 4 },
              { name: 'Drum Modules', level: 4 },
            ],
          },
          {
            name: 'Percussion',
            level: 3,
            children: [
              { name: 'Hand Percussion (Cajon, Bongos, Congas)', level: 4 },
              { name: 'Orchestral / Band Percussion', level: 4 },
              { name: 'Small Percussion (Shakers, Tambourines)', level: 4 },
            ],
          },
          {
            name: 'Drum Hardware & Accessories',
            level: 3,
            children: [
              { name: 'Stands & Pedals', level: 4 },
              { name: 'Drumheads', level: 4 },
              { name: 'Cases & Bags', level: 4 },
            ],
          },
        ],
      },
      {
        name: 'Keyboards & Pianos',
        level: 2,
        children: [
          {
            name: 'Digital Pianos',
            level: 3,
            children: [
              { name: 'Console / Home', level: 4 },
              { name: 'Stage Pianos', level: 4 },
            ],
          },
          {
            name: 'Synthesizers & Workstations',
            level: 3,
            children: [
              { name: 'Performance Synths', level: 4 },
              { name: 'Workstations', level: 4 },
            ],
          },
          { name: 'Portable Keyboards & Arrangers', level: 3 },
          { name: 'MIDI Controllers & Pad Controllers', level: 3 },
          {
            name: 'Keyboard Accessories',
            level: 3,
            children: [
              { name: 'Stands & Benches', level: 4 },
              { name: 'Pedals & Expression', level: 4 },
              { name: 'Cases & Bags', level: 4 },
            ],
          },
        ],
      },
      {
        name: 'Orchestral, Band & Folk',
        level: 2,
        children: [
          { name: 'Orchestral Strings (Violin/Viola/Cello/Double Bass)', level: 3 },
          { name: 'Brass & Woodwind', level: 3 },
          { name: 'Folk & Traditional (Ukulele, Mandolin, Banjo, etc.)', level: 3 },
          { name: 'Educational Packs & Classroom Instruments', level: 3 },
        ],
      },
    ],
  },
  {
    name: 'Studio, Recording & Production',
    level: 1,
    children: [
      {
        name: 'Audio Interfaces & Converters',
        level: 2,
        children: [
          { name: 'Desktop Interfaces', level: 3 },
          { name: 'Rackmount Interfaces', level: 3 },
          { name: 'Digital Converters & Clocks', level: 3 },
        ],
      },
      {
        name: 'Studio Monitors & Headphones',
        level: 2,
        children: [
          {
            name: 'Nearfield & Midfield Monitors',
            level: 3,
            children: [
              { name: 'Active', level: 4 },
              { name: 'Passive', level: 4 },
            ],
          },
          { name: 'Subwoofers', level: 3 },
          {
            name: 'Studio Headphones',
            level: 3,
            children: [
              { name: 'Closed-Back', level: 4 },
              { name: 'Open / Semi-Open', level: 4 },
            ],
          },
          { name: 'In-Ear Monitoring (Studio & Stage)', level: 3 },
        ],
      },
      {
        name: 'Microphones (Studio)',
        level: 2,
        children: [
          {
            name: 'Condenser Mics',
            level: 3,
            children: [
              { name: 'Large Diaphragm', level: 4 },
              { name: 'Small Diaphragm', level: 4 },
            ],
          },
          { name: 'Dynamic Mics', level: 3 },
          { name: 'Ribbon Mics', level: 3 },
          { name: 'USB & Podcast Mics', level: 3 },
          { name: 'Mic Packs & Bundles', level: 3 },
        ],
      },
      {
        name: 'Outboard & Signal Processing',
        level: 2,
        children: [
          { name: 'Preamps & Channel Strips', level: 3 },
          { name: 'Compressors & Limiters', level: 3 },
          { name: 'EQ & Filters', level: 3 },
          { name: 'Multi-FX & Reverb Units', level: 3 },
          { name: 'Monitor Controllers & Headphone Amps', level: 3 },
        ],
      },
      {
        name: 'Recording Tools & Controllers',
        level: 2,
        children: [
          { name: 'DAW Controllers & Control Surfaces', level: 3 },
          { name: 'MIDI Keyboards & Pad Controllers (Studio)', level: 3 },
          { name: 'Studio Computers / Audio PCs (if applicable)', level: 3 },
        ],
      },
      {
        name: 'Studio Furniture & Acoustic Treatment',
        level: 2,
        children: [
          { name: 'Studio Desks & Racks', level: 3 },
          { name: 'Monitor Stands', level: 3 },
          { name: 'Acoustic Panels & Bass Traps', level: 3 },
          { name: 'Vocal Booths & Reflection Filters', level: 3 },
        ],
      },
    ],
  },
  {
    name: 'Live Sound & PA',
    level: 1,
    children: [
      {
        name: 'PA Systems & Loudspeakers',
        level: 2,
        children: [
          {
            name: 'Portable PA Systems',
            level: 3,
            children: [
              { name: 'All-in-One Column Systems', level: 4 },
              { name: 'Small PA Packages (Speaker + Mixer)', level: 4 },
            ],
          },
          {
            name: 'Full-Range Speakers',
            level: 3,
            children: [
              {
                name: 'Active (Powered)',
                level: 4,
                children: [
                  { name: '8–10"', level: 5 },
                  { name: '12–15"+', level: 5 },
                ],
              },
              { name: 'Passive', level: 4 },
            ],
          },
          {
            name: 'Subwoofers',
            level: 3,
            children: [
              { name: 'Active', level: 4 },
              { name: 'Passive', level: 4 },
            ],
          },
          { name: 'Installed Speakers (Ceiling, Wall, Column, Horn)', level: 3 },
        ],
      },
      {
        name: 'Mixing Consoles',
        level: 2,
        children: [
          {
            name: 'Analog Mixers',
            level: 3,
            children: [
              { name: 'Compact (2–12 channels)', level: 4 },
              { name: 'Medium / Large', level: 4 },
            ],
          },
          {
            name: 'Digital Mixers',
            level: 3,
            children: [
              { name: 'Rack / Stagebox Mixers', level: 4 },
              { name: 'Surface + Stagebox Systems', level: 4 },
            ],
          },
          { name: 'Powered Mixers', level: 3 },
        ],
      },
      {
        name: 'Microphones (Live)',
        level: 2,
        children: [
          { name: 'Vocal & Instrument Dynamics', level: 3 },
          { name: 'Drum & Instrument Mic Packs', level: 3 },
          { name: 'Installed & Paging Mics (Gooseneck, Boundary)', level: 3 },
        ],
      },
      {
        name: 'Wireless Systems',
        level: 2,
        children: [
          { name: 'Handheld Systems', level: 3 },
          { name: 'Lavalier & Headset Systems', level: 3 },
          { name: 'Instrument Wireless', level: 3 },
          { name: 'In-Ear Monitor Systems', level: 3 },
          { name: 'Antenna Distribution & Accessories', level: 3 },
        ],
      },
      {
        name: 'Signal Processing & System Management',
        level: 2,
        children: [
          { name: 'PA Controllers & DSP', level: 3 },
          { name: 'Graphic & Parametric EQ', level: 3 },
          { name: 'Crossovers', level: 3 },
          { name: 'Feedback Suppressors & Auto Mixers', level: 3 },
        ],
      },
      {
        name: 'Public Address & 100V Line',
        level: 2,
        children: [
          { name: 'Paging Amplifiers & Mixers', level: 3 },
          { name: '100V Speakers (Ceiling, Wall, Horn, Column)', level: 3 },
          { name: 'Zone Mixers & Routers', level: 3 },
          { name: 'Evac & Voice Alarm (if applicable)', level: 3 },
        ],
      },
      {
        name: 'Live Sound Accessories',
        level: 2,
        children: [
          { name: 'Speaker Stands & Poles', level: 3 },
          { name: 'Mic Stands & Clips', level: 3 },
          { name: 'Flight Cases & Bags (Speakers, Mixers, Racks)', level: 3 },
          { name: 'DI Boxes', level: 3 },
          { name: 'Stage Snakes & Multicores', level: 3 },
        ],
      },
    ],
  },
  {
    name: 'DJ & Electronic Music',
    level: 1,
    children: [
      {
        name: 'DJ Players & Controllers',
        level: 2,
        children: [
          { name: 'Media Players (Standalone)', level: 3 },
          { name: 'DJ Controllers (Laptop/Software)', level: 3 },
          { name: 'All-in-One DJ Systems', level: 3 },
        ],
      },
      {
        name: 'DJ Mixers',
        level: 2,
        children: [
          { name: '2-Channel Mixers', level: 3 },
          { name: '4-Channel & Club Mixers', level: 3 },
          { name: 'Scratch / Battle Mixers', level: 3 },
        ],
      },
      {
        name: 'Turntables & Cartridges',
        level: 2,
        children: [
          { name: 'DJ Turntables', level: 3 },
          { name: 'Hi-Fi Turntables', level: 3 },
          { name: 'Cartridges & Styli', level: 3 },
        ],
      },
      {
        name: 'DJ Monitoring & PA',
        level: 2,
        children: [
          { name: 'DJ Headphones', level: 3 },
          { name: 'Booth Monitors', level: 3 },
          { name: 'Compact DJ PA Systems', level: 3 },
        ],
      },
      {
        name: 'DJ Effects & Accessories',
        level: 2,
        children: [
          { name: 'FX Units & Samplers', level: 3 },
          { name: 'Laptop Stands', level: 3 },
          { name: 'Controller Cases & Bags', level: 3 },
          { name: 'Slipmats, Faders, Spare Parts', level: 3 },
        ],
      },
    ],
  },
  {
    name: 'Lighting, Stage & Effects',
    level: 1,
    children: [
      {
        name: 'Entertainment Lighting Fixtures',
        level: 2,
        children: [
          { name: 'PAR & Wash Lights', level: 3 },
          { name: 'Spot & Profile Fixtures', level: 3 },
          { name: 'Moving Heads (Spot/Wash/Beam/Hybrid)', level: 3 },
          { name: 'LED Bars & Strip Fixtures', level: 3 },
          { name: 'UV, Strobe & Blacklight', level: 3 },
        ],
      },
      {
        name: 'Architectural & Install Lighting',
        level: 2,
        children: [
          { name: 'LED Fixtures (Indoor/Outdoor)', level: 3 },
          { name: 'Wall Washers & Linear Fixtures', level: 3 },
          { name: 'Downlights & Accent Fixtures', level: 3 },
        ],
      },
      {
        name: 'Control & Dimming',
        level: 2,
        children: [
          { name: 'DMX Controllers & Consoles', level: 3 },
          { name: 'DMX Splitters, Nodes & Interfaces', level: 3 },
          { name: 'Dimmers & Relay Packs', level: 3 },
        ],
      },
      {
        name: 'Effects Machines',
        level: 2,
        children: [
          { name: 'Fog & Smoke Machines', level: 3 },
          { name: 'Haze Machines', level: 3 },
          { name: 'Bubble & Snow Machines', level: 3 },
          { name: 'Fluids & Consumables', level: 3 },
        ],
      },
      {
        name: 'Truss, Staging & Rigging',
        level: 2,
        children: [
          { name: 'Truss (Box, Ladder, etc.)', level: 3 },
          { name: 'Stage Platforms & Risers', level: 3 },
          { name: 'Lifting Systems (Wind-Ups, Cranks, Hoists)', level: 3 },
          { name: 'Clamps, Couplers & Rigging Hardware', level: 3 },
        ],
      },
      {
        name: 'Stands & Support',
        level: 2,
        children: [
          { name: 'Lighting Stands & T-Bars', level: 3 },
          { name: 'Speaker Stands', level: 3 },
          { name: 'TV & Screen Mounts / Brackets', level: 3 },
        ],
      },
    ],
  },
  {
    name: 'Installed AV, Conferencing & Video',
    level: 1,
    children: [
      {
        name: 'Projectors & Screens',
        level: 2,
        children: [
          { name: 'Projectors (Business, Education, Cinema)', level: 3 },
          {
            name: 'Projection Screens',
            level: 3,
            children: [
              { name: 'Fixed Frame', level: 4 },
              { name: 'Manual / Electric Pull-Down', level: 4 },
              { name: 'Portable / Tripod', level: 4 },
            ],
          },
        ],
      },
      {
        name: 'Displays & Mounting',
        level: 2,
        children: [
          { name: 'Professional & Commercial Displays', level: 3 },
          { name: 'Video Walls & LED Panels', level: 3 },
          {
            name: 'TV & Display Mounts',
            level: 3,
            children: [
              { name: 'Fixed', level: 4 },
              { name: 'Tilt', level: 4 },
              { name: 'Full Motion / Articulating', level: 4 },
            ],
          },
        ],
      },
      {
        name: 'Conferencing & Collaboration',
        level: 2,
        children: [
          { name: 'Conference Microphones & Boundary Mics', level: 3 },
          { name: 'USB & Network Conferencing Bars', level: 3 },
          { name: 'Speakerphones & Meeting Room Systems', level: 3 },
          { name: 'Lecture Capture & Streaming Devices', level: 3 },
        ],
      },
      {
        name: 'Signal Management & Distribution',
        level: 2,
        children: [
          { name: 'Switchers & Matrix Switchers (HDMI/SDI/AVoIP)', level: 3 },
          { name: 'Extenders & Splitters', level: 3 },
          { name: 'Scalers & Converters', level: 3 },
          { name: 'Control Systems & Touch Panels', level: 3 },
        ],
      },
      {
        name: 'Installed Audio',
        level: 2,
        children: [
          { name: 'Ceiling Speakers', level: 3 },
          { name: 'Wall Speakers', level: 3 },
          { name: 'Column & Line Array Install Speakers', level: 3 },
          { name: 'Installed Amplifiers & DSP', level: 3 },
        ],
      },
    ],
  },
  {
    name: 'Consumer Audio, Hi-Fi & Portable',
    level: 1,
    children: [
      {
        name: 'Home Hi-Fi Components',
        level: 2,
        children: [
          { name: 'Amplifiers & Receivers', level: 3 },
          { name: 'CD / Media Players', level: 3 },
          { name: 'Tuners & Network Streamers', level: 3 },
        ],
      },
      {
        name: 'Speaker Systems',
        level: 2,
        children: [
          { name: 'Stereo Speakers', level: 3 },
          { name: 'Home Theatre Systems & Soundbars', level: 3 },
          { name: 'Subwoofers', level: 3 },
        ],
      },
      {
        name: 'Headphones & Earphones (Consumer)',
        level: 2,
        children: [
          { name: 'Over-Ear & On-Ear', level: 3 },
          { name: 'In-Ear / Earbuds', level: 3 },
          { name: 'True Wireless & Bluetooth', level: 3 },
        ],
      },
      {
        name: 'Portable & Bluetooth Speakers',
        level: 2,
        children: [
          { name: 'Compact Portable', level: 3 },
          { name: 'Rugged / Outdoor', level: 3 },
          { name: 'Party & High-Power Speakers', level: 3 },
        ],
      },
      {
        name: 'Personal Audio & Accessories',
        level: 2,
        children: [
          { name: 'MP3 / Media Players (if applicable)', level: 3 },
          { name: 'Docking Stations & Cradles', level: 3 },
        ],
      },
    ],
  },
  {
    name: 'Cables, Connectors & Power',
    level: 1,
    children: [
      {
        name: 'Audio Cables',
        level: 2,
        children: [
          { name: 'Microphone Cables (XLR/XLR, XLR/Jack)', level: 3 },
          { name: 'Instrument Cables (Guitar/TS)', level: 3 },
          { name: 'Speaker Cables', level: 3 },
          { name: 'Insert, Patch & Y-Cables', level: 3 },
        ],
      },
      {
        name: 'Data & Digital Cables',
        level: 2,
        children: [
          { name: 'MIDI & USB', level: 3 },
          { name: 'Network (CAT5/6/7)', level: 3 },
          { name: 'Digital Audio (AES/EBU, SPDIF, ADAT)', level: 3 },
        ],
      },
      {
        name: 'Video & AV Cables',
        level: 2,
        children: [
          { name: 'HDMI / DisplayPort', level: 3 },
          { name: 'VGA & Legacy Video', level: 3 },
          { name: 'SDI & Coax Video', level: 3 },
        ],
      },
      {
        name: 'Power Cables & Distribution',
        level: 2,
        children: [
          { name: 'IEC & Mains Leads', level: 3 },
          { name: 'Power Strips & Conditioners', level: 3 },
          { name: 'PowerCON & Locking Connectors', level: 3 },
        ],
      },
      {
        name: 'Connectors & Bulk Cable',
        level: 2,
        children: [
          { name: 'Audio Connectors (XLR, Jack, SpeakON, RCA)', level: 3 },
          { name: 'Power & PowerCON Connectors', level: 3 },
          { name: 'Bulk Audio / Speaker / Data Cable', level: 3 },
        ],
      },
    ],
  },
  {
    name: 'Accessories, Cases, Racks & Stands',
    level: 1,
    children: [
      {
        name: 'Instrument Accessories',
        level: 2,
        children: [
          { name: 'Guitar Strings, Picks, Capos, Slides', level: 3 },
          { name: 'Drumsticks, Drumkeys, Practice Pads', level: 3 },
          { name: 'Keyboard Covers, Pedals, Benches', level: 3 },
          { name: 'Orchestral & Band Accessories', level: 3 },
        ],
      },
      {
        name: 'Cases & Bags',
        level: 2,
        children: [
          { name: 'Instrument Cases & Bags', level: 3 },
          { name: 'Mixer & Rack Cases', level: 3 },
          { name: 'Speaker & Monitor Covers', level: 3 },
          { name: 'DJ & Controller Cases', level: 3 },
        ],
      },
      {
        name: 'Racks & Rack Accessories',
        level: 2,
        children: [
          { name: 'Rack Cabinets & Flightcases', level: 3 },
          { name: 'Rack Shelves, Panels & Hardware', level: 3 },
          { name: 'Rack Power & Cooling', level: 3 },
        ],
      },
      {
        name: 'Stands & Mounts (General)',
        level: 2,
        children: [
          { name: 'Instrument Stands (Guitar, Keyboard, etc.)', level: 3 },
          { name: 'Microphone Stands & Booms', level: 3 },
          { name: 'Music Stands & Conductor Stands', level: 3 },
        ],
      },
    ],
  },
  {
    name: 'Spares, Components & Consumables',
    level: 1,
    children: [
      {
        name: 'Electronic Spares',
        level: 2,
        children: [
          { name: 'Replacement Drivers & HF Units', level: 3 },
          { name: 'Faders, Pots & Switches', level: 3 },
          { name: 'Power Supplies & Modules', level: 3 },
        ],
      },
      {
        name: 'Instrument Spares',
        level: 2,
        children: [
          { name: 'Guitar Parts (Bridges, Tuners, Nuts)', level: 3 },
          { name: 'Drum Parts (Lugs, Hoops, Pedals Parts)', level: 3 },
          { name: 'Keyboard & Digital Piano Parts', level: 3 },
        ],
      },
      {
        name: 'Lighting & Rigging Spares',
        level: 2,
        children: [
          { name: 'Lamps, LEDs, Boards', level: 3 },
          { name: 'Clamps, Bolts & Rigging Parts', level: 3 },
        ],
      },
      {
        name: 'Maintenance & Care',
        level: 2,
        children: [
          { name: 'Cleaning Products & Polishes', level: 3 },
          { name: 'Lubricants & Contact Cleaners', level: 3 },
          { name: 'Tools & Testers', level: 3 },
        ],
      },
    ],
  },
];

function buildPath(parentPath: string | undefined, name: string): string {
  const slug = slugify(name);
  if (!parentPath) {
    return `/${slug}`;
  }
  return `${parentPath}/${slug}`;
}

interface CategoryInsert {
  name: string;
  level: number;
  path: string;
  parentPath?: string;
}

function flattenHierarchy(
  nodes: CategoryNode[],
  parentPath?: string,
): CategoryInsert[] {
  const result: CategoryInsert[] = [];

  for (const node of nodes) {
    const path = buildPath(parentPath, node.name);
    result.push({
      name: node.name,
      level: node.level,
      path,
      parentPath,
    });

    if (node.children) {
      result.push(...flattenHierarchy(node.children, path));
    }
  }

  return result;
}

const allCategories = flattenHierarchy(hierarchy);

// Generate SQL
function generateSQL(): string {
  let sql = `-- Migration: Seed Comprehensive Category Hierarchy
-- Description: Seeds the complete 5-level category hierarchy from Categories_Hierachy.md
-- Generated: ${new Date().toISOString()}

BEGIN;

-- Function to get category_id by path (for parent lookups)
CREATE OR REPLACE FUNCTION get_category_id_by_path(category_path TEXT)
RETURNS UUID AS $$
  SELECT category_id FROM core.category WHERE path = category_path;
$$ LANGUAGE SQL STABLE;

`;

  // Group by level for ordered insertion
  const byLevel: { [key: number]: CategoryInsert[] } = {};
  for (const cat of allCategories) {
    if (!byLevel[cat.level]) {
      byLevel[cat.level] = [];
    }
    byLevel[cat.level].push(cat);
  }

  // Insert level by level
  for (let level = 1; level <= 5; level++) {
    if (!byLevel[level]) continue;

    sql += `\n-- Level ${level} Categories\n`;
    for (const cat of byLevel[level]) {
      const parentIdExpr = cat.parentPath
        ? `get_category_id_by_path('${cat.parentPath.replace(/'/g, "''")}')`
        : 'NULL';
      const nameEscaped = cat.name.replace(/'/g, "''");
      const pathEscaped = cat.path.replace(/'/g, "''");

      sql += `INSERT INTO core.category (name, parent_id, level, path, is_active, created_at, updated_at)
VALUES ('${nameEscaped}', ${parentIdExpr}::uuid, ${cat.level}, '${pathEscaped}', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

`;
    }
  }

  sql += `\n-- Cleanup function
DROP FUNCTION IF EXISTS get_category_id_by_path(TEXT);

COMMIT;

-- Verification queries (commented out - uncomment to verify)
-- SELECT level, COUNT(*) as count FROM core.category GROUP BY level ORDER BY level;
-- SELECT * FROM core.category WHERE level = 1 ORDER BY name;
`;

  return sql;
}

// Write SQL file
import { writeFileSync } from 'fs';
import { join } from 'path';

const sql = generateSQL();
const outputPath = join(process.cwd(), 'migrations', '0034_seed_comprehensive_category_hierarchy.sql');
writeFileSync(outputPath, sql, 'utf-8');

console.log(`✅ Generated migration file: ${outputPath}`);
console.log(`📊 Total categories: ${allCategories.length}`);
console.log(`📈 By level:`);
for (let level = 1; level <= 5; level++) {
  const count = allCategories.filter((c) => c.level === level).length;
  if (count > 0) {
    console.log(`   Level ${level}: ${count} categories`);
  }
}

