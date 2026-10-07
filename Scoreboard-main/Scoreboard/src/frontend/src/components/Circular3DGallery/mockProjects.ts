import { GalleryItem } from "./types";

export const MOCK_PROJECTS: GalleryItem[] = [
  {
    id: "proj-1",
    title: "DSSL Sports Arena Haridwar",
    description: "Evening floodlight matches at the Haridwar Sports Ground with real-time biometric telemetry and drone tracking.",
    category: "Venue & Highlights",
    badge: "Featured Event",
    image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80",
    tags: ["Cricket", "Volleyball", "Haridwar", "Floodlights"],
    metrics: [
      { label: "Matches", value: "64" },
      { label: "Attendance", value: "4.8K" },
      { label: "Photos", value: "69" }
    ],
    author: {
      name: "DSSL Media Unit",
      role: "Ground Operations",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
    },
    location: "Haridwar, Uttarakhand, India 🇮🇳",
    date: "Sunday, 13/09/2026",
    link: "https://dsspl.in/gallery",
    featured: true,
    metadata: {
      gpsCoords: "Lat 29.997936, Long 78.193212",
      camera: "GPS Map Camera 4K",
      weather: "24°C Clear Sky"
    }
  },
  {
    id: "proj-2",
    title: "Realtime WebSocket Scoreboard",
    description: "Sub-millisecond latency live scoring engine streaming ball-by-ball updates to thousands of concurrent spectators.",
    category: "Full Stack Engine",
    badge: "Realtime Core",
    image: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80",
    tags: ["React 19", "WebSockets", "Node.js", "Redis"],
    metrics: [
      { label: "Latency", value: "<15ms" },
      { label: "Concurrent", value: "12K+" },
      { label: "Sync Rate", value: "60Hz" }
    ],
    author: {
      name: "Tech Operations",
      role: "Lead Architect",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
    },
    location: "DSVV Cloud Infrastructure",
    date: "Active 2026 Season",
    github: "https://github.com",
    link: "https://dsspl.in/scoreboard"
  },
  {
    id: "proj-3",
    title: "Computer Vision Player Tracking",
    description: "Edge AI pose estimation on courts tracking player speed, sprint trajectories, heatmaps, and stamina indexes in real time.",
    category: "Edge AI / Vision",
    badge: "AI Powered",
    image: "https://images.unsplash.com/photo-1519766304817-4f37bda74a29?auto=format&fit=crop&w=1200&q=80",
    tags: ["PyTorch", "YOLOv10", "WebAssembly", "WebGL"],
    metrics: [
      { label: "Precision", value: "98.4%" },
      { label: "FPS", value: "120" },
      { label: "Tracked", value: "22/sec" }
    ],
    author: {
      name: "AI Research Lab",
      role: "Computer Vision",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
    },
    location: "Main Athletics Pavilion",
    date: "Autumn 2026",
    github: "https://github.com"
  },
  {
    id: "proj-4",
    title: "Vashishta Mandal Championship Hub",
    description: "Team management and performance analytics portal for Vashishta Mandal athletes, tactics, and medal standings.",
    category: "Mandal Analytics",
    badge: "Gold Contender",
    image: "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=1200&q=80",
    tags: ["TypeScript", "Tailwind", "PostgreSQL", "Charts"],
    metrics: [
      { label: "Medals", value: "18 🥇" },
      { label: "Squad", value: "42" },
      { label: "Win Rate", value: "76%" }
    ],
    author: {
      name: "Mandal Council",
      role: "Team Management",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
    },
    location: "Vashishta Headquarters",
    date: "Season 2026"
  },
  {
    id: "proj-5",
    title: "Dynamic High-FPS 3D Carousel",
    description: "Direct DOM transform mutations bypassing React reconciliation inside rAF with physics momentum and depth-of-field.",
    category: "Creative Dev",
    badge: "60/120 FPS",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    tags: ["CSS 3D", "rAF Loop", "Physics", "Zero-Jank"],
    metrics: [
      { label: "Frame Rate", value: "120 FPS" },
      { label: "Re-renders", value: "0/frame" },
      { label: "GPU Load", value: "3.2%" }
    ],
    author: {
      name: "Antigravity UI",
      role: "Performance Engineer",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
    },
    location: "Client Browser GPU",
    date: "October 2026",
    github: "https://github.com"
  },
  {
    id: "proj-6",
    title: "Tournament Medal Tally & Awards",
    description: "Automated ranking calculations, tie-break resolver, and certificate generator with verifiable cryptographic signatures.",
    category: "Governance & Awards",
    badge: "Official Record",
    image: "https://images.unsplash.com/photo-1569517282132-25d22f4573e6?auto=format&fit=crop&w=1200&q=80",
    tags: ["Next.js", "Prisma", "PDFKit", "Crypto"],
    metrics: [
      { label: "Certificates", value: "1.2K" },
      { label: "Sports", value: "14" },
      { label: "Trophies", value: "38" }
    ],
    author: {
      name: "Sports Committee",
      role: "Awards Jury",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80"
    },
    location: "Convocation Hall",
    date: "Grand Finale 2026"
  },
  {
    id: "proj-7",
    title: "Jamdagni Warriors Volleyball League",
    description: "Spike velocity measurement, court coverage visualization, and set-by-set telemetry for premier volleyball matches.",
    category: "Sports Dynamics",
    badge: "Match Highlight",
    image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80",
    tags: ["Volleyball", "High Speed", "Tactics", "Sensors"],
    metrics: [
      { label: "Max Spike", value: "108 km/h" },
      { label: "Aces", value: "24" },
      { label: "Sets", value: "5" }
    ],
    author: {
      name: "Jamdagni Mandal",
      role: "Athletics Lead",
      avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=150&q=80"
    },
    location: "Court 2, Haridwar",
    date: "14/09/2026"
  },
  {
    id: "proj-8",
    title: "Student Registration SRS Portal",
    description: "Streamlined registration workflows with Excel bulk imports, scholar ID validation, QR passes, and role allocations.",
    category: "Enterprise System",
    badge: "Live System",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    tags: ["React 18", "XLSX", "QR Code", "Tailwind 4"],
    metrics: [
      { label: "Athletes", value: "2,400+" },
      { label: "Colleges", value: "8" },
      { label: "Passes Issued", value: "100%" }
    ],
    author: {
      name: "Registrar Cell",
      role: "Admin Bureau",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80"
    },
    location: "Administrative Block",
    date: "Academic Year 2026"
  }
];
