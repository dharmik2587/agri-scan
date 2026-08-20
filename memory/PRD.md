# AgriScan — Product Requirements Document

## Original Problem Statement
Build a responsive web app called "AgriScan" for plant/crop health diagnosis and farm management.
- Landing page + optional login (email + Google), guest allowed for core features
- AI-powered image diagnosis (plant, disease, severity, fertilizer, prevention, treatment)
- Pesticide/Fertilizer calculator with charts and safety warnings
- Market prices module (mandi-style India) with trend charts and produce listings
- Scan history for logged-in users, profile/settings
- Clean, mobile-first, agriculture-themed design; Hindi + English toggle
- Diagnosis model and market API must be swappable

## User Choices
- Diagnosis AI: Claude Sonnet 5 vision via Emergent LLM key
- Auth: Both JWT email/password AND Emergent Google auth
- Market data: Mock (realistic Indian mandi structure, swappable)
- Regional language toggle: English + Hindi
- Image upload: 10 MB, stored in Emergent object storage

## Architecture
- Backend: FastAPI (Python), MongoDB, Motor, JWT auth, bcrypt, Emergent LLM (`emergentintegrations`), Emergent object storage
- Frontend: React 19 + React Router 7, Tailwind, shadcn UI, Recharts for charts, sonner toasts, lucide-react icons, Outfit + Work Sans fonts
- Design system: Organic & Earthy palette (Forest green #244834, Moss #8CAE68, Terracotta #D36D4D, bone-white #FBFBF9)

## What's Been Implemented (Feb 2026)
- **Auth**: /register, /login (JWT), /emergent-session (Google), /me, /language
- **Diagnosis**: /diagnose (Claude Sonnet 5 vision) + image storage via Emergent object storage
- **Scans CRUD**: list, get, delete (auth required)
- **Calculator**: /calculator + /calculator/crops
- **Market**: /market/crops, /prices, /trend, /listings (GET/POST/DELETE) — now Agmarknet-first with graceful mock fallback + `source` field
- **Crop Advisor**: searchable crop combobox (~100 crops), state (36 states/UTs) + district selectors, optional question + photo, returns locality-specific soil/fertilizers/pesticides/diseases/pests/safety in EN or HI via Claude Sonnet 5
- **Voice Advisor**: microphone button records audio → Whisper STT → fills question in the selected language (Hindi supported natively); "Read aloud" button on advisor results uses browser SpeechSynthesis (Hindi + Indian English voices)
- **Voice Diagnosis** (NEW): notes textarea + mic on the UploadZone; voice notes are transcribed via Whisper and sent to `/api/diagnose` as the `notes` field, which is woven into Claude Sonnet 5's context for a more precise diagnosis
- **Weather Alerts** (NEW): 7-day forecast on the Dashboard via Open-Meteo (free, no key). Shows current temperature, humidity, wind, plus a **spray-suitability badge per day** (good / caution / avoid) derived from rain probability, wind and heat. Location auto-detected via browser geolocation, searchable via city name (data.geocoding-api.open-meteo)
- **Live Mandi Feed**: /market/prices and /market/trend try Agmarknet (data.gov.in resource `9ef84268-d588-465a-a308-a864a43d0070`) and cache results in MongoDB (`mandi_prices`) to progressively build real trend history; source flagged on UI
- **Frontend pages**: Landing, Login (email + Google), Dashboard (upload + weather + recent scans), Diagnosis Report, Calculator (charts), Market (trend + listings + LIVE/DEMO badge), History, Profile, Advisor, Auth callback
- **UX**: EN/हिं toggle in header, animated hero, grain textures, staggered card reveals, mobile-responsive
- **Testing**: iteration_1 15/15 + iteration_2 14/14 + iteration_3 14/14 all pass

## Prioritized Backlog

### P0 — Done
- Auth (email + Google), Diagnosis, Advisor, Calculator, Market, History, Profile, i18n EN/HI

### P1 — Not yet implemented
- Voice input in Advisor (Hindi speech-to-text via OpenAI Whisper)
- Push notifications for market-price alerts (email or web push)
- Real Agmarknet API integration (structure already swappable)
- More Indian regional languages (Marathi, Tamil, Telugu, Bengali)

### P2 — Nice to have
- Offline PWA support for low-connectivity farmers
- Community Q&A between farmers
- Vernacular audio playback of the advisory (TTS)
- Downloadable PDF advisory
- Rate limiting on LLM endpoints (advisor + diagnose)
- WhatsApp share button for produce listings

## Known Minor Items
- Small React hydration warning from translated placeholder inside <option> — cosmetic only, no user impact
