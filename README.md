# Spinex IT Solutions website

Next.js 14 (App Router) + Tailwind CSS + Framer Motion + Lenis smooth scroll.
No backend or database.

## Run it

1. Create a free MongoDB database at mongodb.com/atlas, then copy its connection string.
2. Copy `.env.example` to `.env.local` and fill in:
   - `MONGODB_URI` (the connection string), `MONGODB_DB=spinex`
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` (your admin login)
   - `AUTH_SECRET`: any random text of 32+ characters
3. Run:

```bash
npm install
npm run dev     # http://localhost:3000, admin at /admin
```

Deploy on Vercel: import the repo and add the same environment variables in Project Settings. In MongoDB Atlas, allow access from anywhere (0.0.0.0/0) under Network Access so Vercel can connect.

Without `MONGODB_URI` the public website still works with the built-in content; the admin panel, applications and verification need the database.

## Pages

- `/` Home: hero with interactive "live build" window, services, "Why Spinex" bento (screen-size switcher, speed test, runnable code), process, work, showreel, industries, "what do you want to achieve?" goal picker, project planner, FAQ, contact section
- `/services`, `/work`, `/about`, `/contact` (contact page also has the project planner)
- Site-wide: intro loader (once per visit), page fade transitions, scroll progress bar, cursor ring on desktop
- `/internship` roles and application form, `/verify` certificate check
- `/admin` Admin panel: website content, interns, certificates

## Things to add before going live

1. **Showreel video**: put your reel at `public/showreel.mp4` (or set a video URL in Admin > Showreel video). Until then the cover image shows.
2. **Projects**: the six projects are samples. Replace them with real work in Admin > Projects.
3. **Testimonials**: the section stays hidden until you add real client quotes in Admin > Testimonials.
4. **Admin login**: set a strong `ADMIN_PASSWORD` and a random `AUTH_SECRET`.
5. **Certificate signer**: Admin > Certificates, set the name, title and signature image.

## CMS (what you can edit in /admin)

- **Blog posts**: write articles with a formatting toolbar (headings, bold, links, lists, quotes, images from Media), live preview, cover image, category, tags, schedule date, and SEO title/description with a Google preview. Published posts appear at `/blog`, on the home page ("Latest articles") and in the sitemap.
- **Home page**: show, hide and reorder every section; edit each section's heading and short line; edit the tools strip.
- **Page headers**: heading and intro for About, Services, Work, Contact, Internship and Blog.
- **Process steps** and **Goal picker**: fully editable lists.
- **History**: every save keeps the previous version (last 40); restore any of them in one click.

## Team, roles and dashboard

- **Owner** logs in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local` and can add team members in Admin > Team and roles.
- Roles: Owner (everything), Admin (everything except team), Content editor (content, blog, media, SEO), Sales (leads), HR (interns, job applicants, certificates). Every admin API checks the role on the server.
- The Overview page shows charts: leads per month, lead status, sources, top services, latest leads, applications and interns.

## Forms and spam

All public forms have a hidden bot trap, a "filled too fast" check and a rate limit stored in MongoDB. For extra protection, create a free Cloudflare Turnstile widget and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.

## Service pages, careers, WhatsApp and analytics

- Each service has its own SEO page at `/services/<slug>` (text, features, FAQs and quote form editable in Admin > Services).
- `/careers` lists jobs (Admin > Careers); applications arrive in Admin > Interns > Job applicants.
- When you change an applicant to Selected or Not selected, or issue a certificate, the admin panel offers to email them (needs the SMTP settings).
- Floating WhatsApp button and Google Analytics / Microsoft Clarity IDs: Admin > WhatsApp and analytics.
- Favicon: `app/icon.png` and `app/apple-icon.png` (replace them with your own logo PNGs if you like).

## Admin panel (/admin)

- Login is checked on the server (email + password from `.env.local`), with a secure 7-day session cookie.
- Website content is stored in MongoDB. Saving makes changes live for every visitor straight away.
- **Leads**: every enquiry from the contact page, home contact section and project planner is saved here. Move it through New, Contacted, Quote sent, Won or Lost, add a deal value, a follow-up date and notes. Call or WhatsApp in one tap. Download as Excel.
- **Email alerts**: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `NOTIFY_EMAIL` to get an email for every new lead and internship application. With Gmail, use an App Password (myaccount.google.com/apppasswords).
- **Media**: upload images (drag and drop or choose files). Every image field also has Upload and Library buttons, so you never need to paste links. Large photos are resized to 2000px WebP in the browser first. Images are stored in MongoDB (`uploads` bucket) and served from `/api/files/<id>`.
- **Interns**: applications from `/internship` (with resume PDF) arrive here automatically. Search, filter by status, edit, open resumes, download everything as an Excel/CSV file. Applications that came on WhatsApp can be pasted in.
- **Certificates**: mark an intern Completed and press Issue certificate. Each gets a unique number (SPX-2026-0001 …) and opens as an A4 page to save as PDF or print. Edit the wording, signer and signature image under Certificates.
- **/verify**: anyone can type a certificate number to check it's genuine. Only name, role and dates are shown.

MongoDB collections: `settings` (site content), `content_versions` (history), `posts` (blog), `leads`, `interns`, `counters` (certificate numbers), `resumes.files` / `resumes.chunks` (resume PDFs), `uploads.files` / `uploads.chunks` (images).

## Project planner and FAQ

- The planner's timeline estimate uses the ranges in `components/home/Planner.tsx` (`buildDays`, `extras`). Adjust them to match how long your projects really take. It shows no prices.
- The FAQ section uses the same Q&A list as the chatbot (Admin > Chatbot).

## Chatbot

- Works with no setup: answers from the services, contact details and the Q&A list you manage in Admin > Chatbot. Add Hindi/Hinglish keywords for better matching.
- For real AI replies, set `ANTHROPIC_API_KEY` in `.env.local` (and in Vercel environment variables). It uses the small route at `app/api/chat/route.ts` and falls back to the built-in answers if the key is missing or the API fails.

## Where things are

- `lib/content.ts` default text, images and services
- `components/home/*` homepage sections
- `components/admin/*` admin panel
- `tailwind.config.ts` colours and fonts (lavender from the logo, deep ink for dark sections)
