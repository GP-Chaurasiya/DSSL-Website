# DSSL Analytics — 2026 Edition

Dedicated Standalone Player & Team Analytics Dashboard Application for Dev Sanskriti Sports League (DSSL) 2026.

## Features

- **8 Realtime KPI Cards**: Total Players, Male/Female split, Today's Registrations, Mandals, Sports, Live & Completed Games.
- **7 Interactive Chart.js Visualizations**:
  - Registration Trend (with 7, 30, and 60-day view toggles)
  - Players by Mandal
  - Gender Distribution (Donut chart with percentages)
  - Course Distribution (Top courses horizontal bar chart)
  - Semester Distribution (Color-coded bar chart)
  - Sport Participation (Multicolor bar chart)
  - Mandal × Gender Cross Analysis (Stacked bar chart)
- **Team Leaderboard & Performance Table**: Played games, wins, losses, draws, total points per Mandal.
- **Searchable Player Directory**:
  - Real-time search across Name, Scholar ID, Phone, Email, Course.
  - Multi-select filters (Mandal, Course, Semester, Gender, Sport).
  - Pagination (20 players per page).
  - Player Profile Modal card.
  - **Sync Google Sheets** button (pulls directly from live Google Sheet).
  - **Export CSV** button (UTF-8 Excel ready).
  - **Add Player Record** Modal Form.

## Setup & Running

```bash
npm install
npx prisma generate
npm start
```

Open [http://localhost:4000/](http://localhost:4000/) in your browser.
