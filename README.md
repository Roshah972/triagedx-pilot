# TRIAGEDX

ER Walk-In Intake & Triage Accelerator

## Overview

TRIAGEDX is a web-based intake + triage accelerator for Emergency Department (ED) walk-in patients, shifting data entry from staff to patients, generating a provisional Early Warning Score (EWS), and pushing structured intake data into EPIC (via FHIR) to remove registration bottlenecks and reduce dangerous delays.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSockets (to be implemented)

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and other configuration
```

3. Set up the database:
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (or use migrations)
npm run db:push
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── ...
├── lib/                    # Shared utilities and services
│   ├── prisma.ts          # Prisma Client singleton
│   ├── ews/               # Early Warning Score engine
│   │   └── computeProvisionalEws.ts
│   └── epic/              # EPIC FHIR integration
│       └── epicIntegrationService.ts
├── prisma/                 # Database schema
│   └── schema.prisma
└── ...
```

## Key Components

### Prisma Client (`lib/prisma.ts`)
Singleton Prisma Client instance for database access.

### EWS Engine (`lib/ews/computeProvisionalEws.ts`)
Calculates provisional Early Warning Scores from patient intake data. Currently stubbed - implementation pending.

### EPIC Integration (`lib/epic/epicIntegrationService.ts`)
Service for syncing patient data to EPIC via FHIR API. Currently stubbed - implementation pending.

## Development

### Database Commands

- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)

### Code Structure

- Follow the architecture outlined in `ARCHITECTURE.md`
- Use TypeScript strict mode
- Follow naming conventions: PPortal, SDashboard, EwsEngine prefixes
- Keep EPIC integration abstracted behind interfaces

## Next Steps

1. Implement EWS calculation logic in `computeProvisionalEws.ts`
2. Implement EPIC FHIR integration in `epicIntegrationService.ts`
3. Create API routes for intake submission
4. Build P-Portal (Patient Portal) UI
5. Build S-Dashboard (Staff Dashboard) UI
6. Add real-time updates via WebSockets

## License

Private - Internal use only

