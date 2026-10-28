# PM Job Radar

A dashboard of **open Product Management roles pulled straight from top tech companies' career-site feeds**, with a **location filter** and a **resume-vs-job-description match score**. Every card has an **Apply** button that opens the company's own posting.

- **Companies** (four categories, filterable in the sidebar):
  - **FAANG+** – Amazon, Netflix, Microsoft
  - **Big Tech** – NVIDIA, Salesforce, Adobe, Intel, PayPal, Mastercard, Atlassian, Spotify, Palantir, Cloudflare, Datadog, Twilio, Okta, Dropbox, Workday
  - **High-growth** – Stripe, Airbnb, Databricks, Anthropic, OpenAI, Figma, Pinterest, Reddit, Coinbase, Instacart, Robinhood, Lyft, Discord, Duolingo, MongoDB, Asana, GitLab, Scale AI, Notion, Ramp, Linear, Perplexity, CRED, Razorpay, Meesho
  - **Enterprise & Industry** – Visa, Walmart, Target, Capital One, Wells Fargo, General Motors (established employers outside the tech-native world – banking, payments, retail, automotive)
- **Google, Meta, Apple, Uber, JPMorgan Chase, Goldman Sachs, SAP, Oracle, IBM, Cisco and Tesla** have no stable public jobs feed. They appear as one-click search links in the **Sources** panel (the Google link picks up your location filter).
- **No API keys, no database, no environment variables.**
- **Location filter:** pick any number of countries and cities. Selecting a country shows all of its cities; also ticking cities in that country narrows it to just those (e.g. *India + United States + Hyderabad* → Hyderabad roles plus every US role). Cities can also be chosen on their own.
- **Posted filter:** any time, last 24 hours, 7, 14 or 30 days. Some feeds only publish a date (no time) and Greenhouse reports "last updated", so "last 24 hours" is accurate to the day for those.

## Run locally

```bash
npm install        # also copies the PDF/DOCX parsers into public/vendor
npm run dev        # http://localhost:3000
npm test           # offline unit tests (adapters, locations, filters, scoring)
```

Requires Node 20.9+.

## Deploy: GitHub → Vercel

```bash
git init && git add . && git commit -m "PM Job Radar"
git branch -M main
git remote add origin https://github.com/<you>/pm-job-radar.git
git push -u origin main
```

Then at vercel.com → **Add New → Project → import the repo → Deploy**. The defaults (Next.js, `npm run build`) are correct; nothing to configure.

## How it works

| Piece | What it does |
|---|---|
| `src/app/api/source/route.ts` | `GET /api/source?id=stripe` fetches one company's feed server-side, keeps only PM titles, normalises location/level/date, and returns JSON. Only ids from `companies.ts` are accepted (no open proxy). Responses are CDN-cached for 30 min. |
| `src/lib/adapters/*` | One adapter per hiring platform: Greenhouse, Lever, Ashby, SmartRecruiters, Workday, Amazon, Eightfold (Netflix, Microsoft), Atlassian. |
| `src/components/Dashboard.tsx` | The browser calls `/api/source` for each company (6 at a time), so rows appear progressively and one broken site never blocks the rest. |
| `src/lib/scoring.ts` | Resume matching – runs **entirely in your browser**. |
| `src/lib/location.ts` | Turns strings like `Bangalore, KA, IND` or `Remote - US` into country / city / remote for the filters. |

### The match score (0–100)

`40% skills + 25% wording + 20% level fit + 15% domain fit`

- **Skills** – weighted PM skill taxonomy (roadmapping, experimentation, SQL, GTM, stakeholder mgmt, AI/ML…) found in the JD vs. your resume; requirements-section mentions count extra.
- **Wording** – share of the JD's distinctive vocabulary (TF-IDF weighted across all loaded postings) that appears in your resume.
- **Level fit** – your years of experience (from "8+ years…" or your work-history dates) vs. the JD's stated requirement, or the typical range for the title (APM → VP).
- **Domain** – fintech, marketplace, ads, enterprise SaaS, devtools, hardware/mobility, etc.
- Click **Why this score?** on any card to see the breakdown, the skills you cover and the gaps.

It is a transparent keyword-and-level heuristic to help you prioritise – **not** an ATS simulation or a hiring prediction. Tune weights in `src/lib/scoring.ts` and the taxonomy in `src/lib/skills.ts`.

### Privacy

Your resume is parsed (PDF.js / Mammoth) and scored in the browser; it is never sent to a server. By default it is remembered in this browser's `localStorage` – untick **Remember on this device** (or press **Remove**) to wipe it. Saved/Applied marks and filters are also stored only in your browser.

## Adding or removing a company

Edit one line in `src/lib/companies.ts` (`tier` is one of `FAANG+`, `Big Tech`, `High-growth`, `Enterprise & Industry`; the list of tiers lives in `src/lib/types.ts`):

```ts
{ id: "acme", name: "Acme", tier: "Enterprise & Industry", careersUrl: "https://acme.com/careers",
  source: { ats: "greenhouse", board: "acme" } },
```

Find the token from the company's careers URL: `boards.greenhouse.io/<token>` · `jobs.lever.co/<site>` · `jobs.ashbyhq.com/<board>` · `<tenant>.wd5.myworkdayjobs.com/<site>` · `jobs.smartrecruiters.com/<company>`. A wrong token simply shows as "unavailable" in the Sources panel.

## Known limitations

- **Feeds are unofficial in places.** Greenhouse, Lever, Ashby and SmartRecruiters (Visa) offer documented public job-board APIs. Workday, Amazon, Atlassian, Netflix and Microsoft use undocumented endpoints that their sites call themselves; they work today but can change without notice (Netflix, Microsoft, Atlassian and the Workday-hosted enterprises – Walmart, Target, Capital One, Wells Fargo, General Motors – are tagged **beta**; their site names are unverified). Check the **Sources** panel after deploying – it lists every feed's status with the exact error and a Retry button.
- **Dates:** Greenhouse and Workday expose "last updated"/approximate dates rather than the original posting date.
- **Descriptions:** a posting whose feed has no description can't be scored (shown as "–"); open it to read the JD.
- **Scanned (image-only) PDFs** can't be read – paste the text instead.
- Respect each company's terms; this app only reads the public feeds their own career sites use and caches results for 30 minutes.
