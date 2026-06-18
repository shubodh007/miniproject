# SchemeConnect: Government Welfare Scheme Smart Chatbot

This project is a production-grade civics counseling portal and eligibility matching system designed for citizens of **Andhra Pradesh** and **Telangana**, India. It matches eligible citizens with crucial welfare schemes (such as *Jagananna Amma Vodi*, *Telangana Rythu Bharosa*, and *PM Kisan Samman Nidhi*) through a high-precision local rules engine augmented by a secure AI reasoning layer.

---

## 🏛️ Project Architecture & Components

SchemeConnect is designed with a highly modular full-stack architecture pairing a React-Vite client with an Express-Node server:

```
├── README.md                           # This Developer Onboarding Reference Guide
├── server.ts                           # Server Entry Point (boots Vite in Dev, static server in Prod)
├── package.json                        # Scripts & Dependency Declarations
├── vitest.config.ts                    # Vitest Testing Configuration
├── src/
│   ├── App.tsx                         # Main SPA client-side view router and core controller
│   ├── types.ts                        # Global strongly typed interface dictionary
│   ├── i18n/                           # English & Telugu translation catalogs
│   ├── routes/
│   │   └── v1/
│   │       └── router.ts               # Versioned central Express Router for all HTTP endpoints
│   ├── components/                     # Layout, forms, chats, wizard, and tools component modules
│   └── utils/
│       ├── gemini.ts                   # Resilient, lazy-initialized Gemini AI SDK proxy client
│       ├── localReply.ts               # Dynamic local language fallback replies and legal rules
│       ├── logger.ts                   # Winston structured JSON logging transport setup
│       ├── schemas.ts                  # High-precision Zod input schema validators (safeguards)
│       ├── schemeEngine.ts             # Deterministic civic rules matching mechanics engine
│       ├── schemeEngine.test.ts        # Comprehensive unit test coverage for match calculations
│       ├── security.ts                 # Aadhaar masking, hashing, and storage encryption tools
│       └── sessionCache.ts             # Map-based cache with auto-invalidation on profile change
```

---

## ✨ Features Implemented & Hardened

### 1. High-Precision Local Rules Engine (`src/utils/schemeEngine.ts`)
- Implements strict state-level eligibility filters (e.g., *Jagananna Amma Vodi* for classes 1-12 in AP, and *Rythu Bharosa* landowner farmers in Telangana).
- Incorporates specific tenant farmer checks, enforcing that tenant cultivators with Crop Cultivator Rights Cards (CCRC) are eligible for AP-state support but strictly filtered out of Telangana's *Rythu Bharosa* payouts unless they hold official Pattadar titles.
- Replaces absolute hardcoded flat income limits with localized geographic adjustments derived from district-specific factors.

### 2. High-Fidelity Data Validation Schema (`src/utils/schemas.ts`)
- Utilizes **Zod** schema structures to strictly parse, validate, and sanitize user incoming records.
- Enforces age boundaries (0 to 120), safe household income ranges, district enums, and whitelisted occupations.
- Includes automated HTML/JS script tag-stripping transformer blocks to completely isolate raw strings from cross-site scripting (XSS) injection attempts.

### 3. Bulletproof Security & PII Protection (`src/utils/security.ts`)
- Features safe Aadhaar masking: instantly transforms inputs (e.g., `"1234 5678 9012"`) into masked outputs (`"XXXX-XXXX-9012"`).
- Automatically encodes, shifts, and encrypts sensitive citizen data inside browser `localStorage` (encapsulating name, income, and histories) to prevent clear-text data extraction.

### 4. Structured Production Logging (`src/utils/logger.ts`)
- Integrates a structured **Winston Logger** replacing standard `console` calls on the server.
- Formats logs in clean JSON for cloud monitoring compatibility, with customized level colors on development consoles.

### 5. Highly Scalable Map-Based Session Cache (`src/utils/sessionCache.ts`)
- Keys caching results on FNV1a deterministic hashes of profile fields.
- Implements automatic cache invalidation immediately upon detecting user snapshot state changes, eliminating stale cache errors.

### 6. Beautiful, Legally Sound Templates (`src/components/LegalPage.tsx`)
- Auto-injects dynamic local system calendar dates into the document compiler.
- Appends rigorous Witness signature declarations and Notary attestation blocks.

### 7. Universal ARIA Access & Keyboard Navigation (`src/components/LanguageToggle.tsx`, `AppHeader.tsx`)
- Incorporates structured ARIA roles (`radiogroup`, `radio`, `navigation`) with clear labels.
- Adds custom key event listeners, enabling full keyboard-only operability for visually impaired rural citizens.

---

## 🛠️ Onboarding Instructions

### Development Server Run
To initialize, install, and run on port `3000`:
```bash
# Start Node.js dev server with hot module loading
npm run dev
```

### Run Tests with Vitest
To evaluate our comprehensive rules matching suite, run the test runner:
```bash
# Executes Vitest with detailed pass summaries
npm run test
```

### Production Bundling and Execution
To compile and boot the bundled server container:
```bash
# Build Vite client assets & compile Node backend with CJS esbuild standard
npm run build

# Start Standalone CJS production instance on port 3000
npm run start
```

---

## 🔒 Environment Secrets

Configure your local environment variables within a new `.env` file at the project root:

```env
# Google Gemini API key used for counseling reason synthesis (Server-only secret)
GEMINI_API_KEY=your_google_gemini_api_key_here
```
