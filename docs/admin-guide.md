title: Admin Panel Guide
subtitle: How to run the Spinex website, leads, clients, invoices and team from one place.
version: spinexitsolutions.com/admin · Edition 1 · November 2026
---

# Getting started {#start}

## Logging in

Open **spinexitsolutions.com/admin** and enter your **Email** and **Password**, then press **Log in**.

- **Two-step login:** if it is on, type the 6-digit code from your authenticator app (Google Authenticator or similar). Lost your phone? Type one of your backup codes instead.
- **Forgot password?** Type your admin email (or your recovery email) and you will get a link to set a new password. The link goes to the **Recovery email** from **My account**, if one is set. Changing the password logs you out on all other devices.
- If you have 2 or fewer backup codes left, the panel reminds you to make new ones in **My account**.

## Finding your way around

- **Sidebar:** **Overview** is at the top. Everything else is in groups: **CRM**, **Sales and accounts**, **HR and team**, **Website pages**, **Website content**, **Blog and media**, **Site settings**, **Admin and security**. Click a group name to open or close it.
- **Find a section…** at the top of the sidebar searches every section by name. Type "invoice" or "logo" and jump straight there.
- **Purple numbers** next to a section mean something new arrived since you last opened it (new leads, bookings, client messages, leave requests, accepted quotes, feedback, applications). They refresh every 20 seconds.
- **View site** (top right) opens the live website. **Help guide (PDF)** at the bottom of the sidebar opens this guide.
- On a phone, use the menu button at the top left to open the sidebar.

## Saving your changes

Website sections (pages, content and settings) work like a draft until you publish:

| Button | What it does |
|---|---|
| **Save and publish** | Puts your changes live on the website for everyone. Shows **All saved** when nothing has changed. |
| **Preview** | Opens the website in a new tab with your unsaved changes. Only you can see it. |
| **Discard** | Throws away your unsaved changes. |

- Some sections have their own buttons instead: **Blog posts** (Save / Publish), **Media** (saves on upload), **Certificates** (Save certificate), and most CRM, sales and HR screens (**Save**, **Save settings**).
- If someone else saved while you were editing, you will see **Not saved** with a **Reload** button. Your changes stay on screen.
- Made a mistake after saving? **History** keeps the last 40 versions of the website content (see Admin and security).

## Pictures and lists

**Any picture field** gives you four ways to add a picture: **Upload**, **Library** (from Media), drag a file onto the box, or paste an image link. The small **X** removes it.

- Upload JPG, PNG, WebP, GIF or AVIF images, under about 4 MB each.
- Big photos are made smaller automatically: up to 2000 px wide, or up to 12000 px tall for full-page screenshots.

**Lists** (services, projects, testimonials and so on) all work the same way:

- Click an item's name to open it.
- Use the arrows to move it up or down, and the bin icon to delete it.
- Use the dashed button at the bottom (for example **Add project**) to add a new one.

## Team roles

Each person on the team gets a role. The owner can then set each area to **No access**, **Only view** or **View and change**. Someone with view-only access sees a **View only** banner and can't save.

| Role | What it can do |
|---|---|
| Owner | Everything, including team members |
| Admin | Everything except team members, API keys and backups |
| Manager | Leads, clients, invoices, website and interns. No salaries, profit or bank details |
| Content editor | Website content, blog, media and SEO |
| Blog writer | Writes and publishes blog posts only |
| Marketing / SEO | Website content, blog, SEO, tracking codes, and where leads come from |
| Designer | Image library; can look at website content, blog and client projects |
| Sales | Leads, quotations, invoices and the client portal |
| Telecaller | Calls and updates leads only |
| Support executive | Client portal: support requests, AMC, project updates and files |
| Project manager | Client projects, files and support; can look at leads and invoices |
| Accountant | Invoices, payments, billing details, expenses, profit and GST; can look at payslips |
| HR | Interns, job applicants, certificates, HR letters and payslips |
| Viewer | Can look at most things but change nothing (no salaries or profit) |

> **Team and roles**, **API keys** and **Automation** are always owner-only.

## Staff and client logins

- **Staff portal** (`/staff`): employees log in with their work email and a 6-digit code sent by email. There they can **Check in** and **Check out**, see their **Leave balance**, **Apply for leave**, see their attendance calendar and download **My payslips**.
- **Client portal** (`/portal`): clients log in with their email and a 6-digit code. There they can:
  - follow project stages and updates
  - download and send files
  - view and pay quotations and invoices
  - raise support requests
  - renew their maintenance plan

# Overview and CRM {#crm}

## Overview

The first screen after login. It shows shortcut cards for every area you can open, plus key numbers:

- **Number tiles:** **New leads this week**, **Follow-ups due** (red when above 0), **Won so far**, **Win rate**, **Interns**, **Job applicants**, **Certificates issued**, **Blog posts live**, **Images in media**. Click a tile to open that section.
- **Charts:** **Leads per month**, **Lead status**, **Where leads come from**, **Most asked services**, **Latest leads**.

> **Daily habit:** if **Follow-ups due** is red, click it and call those leads first.

## Leads

Every enquiry lands here: website forms, the project planner, product demo requests, city pages, call bookings, and Meta or Google lead ads.

**You can:**

- Filter with the tiles: **All**, **New**, **Contacted**, **Quote sent**, **Won**, **Lost**, **Follow-up due**, **Given to me**.
- Search by name, phone or message, or filter by source.
- Open **Where leads come from** to see leads, wins and value by source and campaign.
- **Download Excel** of all leads.
- Set up **Get leads from ads** (Meta and Google Ads) and the automatic **Follow-up emails** (up to 4 emails, each after a set number of days).

**Work a new lead:**

1. Click the lead's name to open it.
2. Press **Call**, **WhatsApp** or **Email**.
3. Set **Status** (for example Contacted) and **Deal value (₹)**.
4. Set **Follow up on** (Tomorrow, In 3 days or Next week) and write **What to do**.
5. Choose who it is **Given to**, then press **Save**.
6. When the client is ready, press **Make quotation**. Their details are filled in for you.

**Automatic status changes:**

- Pressing **Call**, **WhatsApp** or **Email** on a *New* lead marks it **Contacted**.
- Making a quotation from a lead marks it **Quote sent**.
- When the client accepts the quotation online, or you make an invoice from it, the lead becomes **Won**.
- **Lost** is always set by you. The panel asks **Why was it lost?** (for example *Price too high* or *Went with someone else*) and **What did they say?**. Open the **Lost** tile to see **Why leads were lost**, with the most common reasons first.

> - Giving a lead to someone sends them an email.
> - Marking a lead **Won** can automatically ask the client for feedback or a Google review.
> - The **Notes** box can be read by anyone on the team who can open that lead. Clients never see it.
> - **Delete** can't be undone.

## Call bookings

Visitors book a free call at `/book`. This section lists the calls and holds the booking settings.

**You can:**

- See **Upcoming** and **Past and cancelled** calls.
- On each call: **Join Meet**, **Call**, **WhatsApp**, mark **Call done** or **Didn't join**, **Cancel** (this emails the client), or add a private note.
- In **Settings**, set:
  - **Length**, **Break after each call** and **Most calls in a day**
  - your weekly hours and **Days off**
  - **How you meet**: Google Meet, a fixed link, or a phone call
  - **Topics to choose from**
  - **Send reminders**

**Turn booking on:**

1. Open **Settings**.
2. Set your hours and call length, and choose how you meet.
3. Press **Save settings**, then flip the switch on.
4. **Copy** the booking link and share it.

> Reminders reach the client a day before and an hour before the call. They work only while the scheduler in **Automation** is running.

## Clients and portal

Manage the clients who log in to `/portal`: their projects, progress, files, invoices, maintenance plans (AMC) and support requests.

**Onboard a client:**

1. Press **Add client**. Enter **Contact name** and **Email** (their login), then press **Add and open**.
2. In **Projects**, press **Add project**. Fill in the name, dates and **Next step**, add **Stages**, and press **Now** on the current stage.
3. Press **Save** at the top. The client sees changes only after you save.
4. Press **Email portal invite**.

**Download Excel** (next to **Add client**) saves every client in a spreadsheet: contact details, login, projects and their current stage, target dates, AMC plans and open support requests.

**Tabs on a client's page:**

- **Projects:** stages, updates and links for each project.
- **AMC:** the yearly maintenance plan, renewal reminders, **Make renewal invoice** and **Renew for 1 year**.
- **Files:** share files with the client and download what they send.
- **Invoices:** tick which quotes and invoices this client can see.
- **Support:** read and reply to requests, then **Close** or **Reopen** them.
- **Details:** contact info, **Private notes** (clients never see these), **Client can log in**, **Delete client**.

> - A **one-time login link** works once and expires after 7 days.
> - Marking a project **Completed** can automatically ask the client for feedback.
> - **Delete client** removes their projects, files and support requests. Their quotes and invoices stay.

## Client feedback

Collect star ratings and comments. You approve the good ones and they show in Testimonials on the home page. Ratings of 3 stars or less show a **Call [name]** button, so you can fix the problem quickly.

**Publish a good review:**

1. Open **Answers** and find one marked *Waiting for approval*.
2. Fix spelling if needed, keeping the client's meaning.
3. Press **Approve for website**.

**Asking clients for feedback:**

- In **Ask and settings**, use **Ask a client now** to send the form by email.
- Or turn on **Ask automatically**: **When a project is marked Completed** or **When a lead is marked Won**, with an optional reminder.

## Google reviews

Shows your Google rating and reviews on the home page, and asks clients to write a review.

**On the website tab:**

- **Live from Google (recommended)** needs your **Google Place ID** and a Places API key in **API keys**. It shows up to 5 reviews.
- **Typed in here** lets you enter the rating and reviews yourself.

**Ask for reviews tab:**

1. Fill in **Ask a client now**.
2. Press **Email the review request**.
3. Or turn on **Ask automatically**.

> Nobody is asked twice within 6 months. Automatic requests need the scheduler in **Automation**.

## Lead emails and alerts

**Thank-you email to new enquiries:**

1. Tick **Send the thank-you email**.
2. Edit the **Subject**, **Heading** and **Message**. You can use `{name}`, `{service}`, `{phone}`, `{email}` and `{company}`. Check the live preview.
3. Optionally tick **Add a "Chat with us on WhatsApp" button**.
4. Press **Save and publish**.

**WhatsApp alert to you:**

- Tick **Send me a WhatsApp alert for new enquiries**. The number and service are set in **API keys → WhatsApp alerts**.

> At most one thank-you email goes to each address per day.

# Sales and accounts {#sales}

## Quotes and invoices

Make GST quotations and invoices, send them to clients, track payments, and set up monthly bills.

**First time: fill in Billing details**

Enter your **Business name (as on GST)**, **Address**, **GSTIN**, **PAN**, bank and UPI details, default GST rate and SAC code, and up to 6 **Signatures**. Then press **Save billing details**.

> With no GSTIN filled in, no GST is charged on your documents.

**Quote, then bill:**

1. Press **New quotation**, or **Make quotation** from a lead.
2. Fill in the client and items (**Add item**, **SAC**, **Qty**, **Rate**, **GST**), then press **Save**.
3. Press **Email to client** or **WhatsApp**. The client can **Accept** or **Request changes** online.
4. Once accepted, press **Make invoice**.
5. Enter **Payment received (₹)** as money comes in. The status changes to Unpaid, Partly paid or Paid automatically.

**Also here:**

- **PDF** download, **Copy client link**.
- **Repeat every month** and the **Monthly bills** tab, for retainers. Set how often and the next invoice date.
- **Payment reminders:** automatic email or WhatsApp reminders around the due date, plus **Send reminder now** and **Stop reminders** on each invoice.
- Status tags: Overdue, Viewed, Accepted online, Changes asked.

> - An accepted quotation is locked. Make a new one to change it.
> - If an invoice was already sent, mark it **Cancelled** instead of deleting it.
> - Online (Razorpay) payments are added automatically.

## Expenses and profit

A monthly profit-and-loss view and a GST summary for your CA.

**The tabs:**

- **Profit and loss:** sales (before GST), expenses, salaries and profit for each month of the financial year. **Download (Excel)**.
- **Expenses:** press **Add expense** and fill in **Date**, **Category**, **Paid to**, **Amount before GST**, **GST on the bill**, **Vendor GSTIN** and **Paid via**. Tick **Repeats every month** for rent and subscriptions.
- **GST for CA:** GST collected, input credit, and **GST to pay** for any period, with **Download for CA (Excel)**.

> - Sales are counted by invoice date. Quotations and cancelled invoices are not counted.
> - Add the vendor's GSTIN to claim input credit.
> - This is a management report. Your CA's books are final.

# HR and team {#hr}

## Interns

Internship and job applications, and intern records from *Applied* to *Completed*.

**You can:**

- Switch between **Interns** and **Job applicants**.
- Filter by status: **Applied**, **Selected**, **Working**, **Completed**, **Not selected**.
- **Add intern**, **Paste application** (it fills the form for you), **Download Excel**.
- On each person: change status, open the resume, make a letter, **Issue certificate**.

**Finish an internship:**

1. Set the status to **Completed**.
2. Press **Issue certificate**.
3. Choose **OK** to issue and email it, or **Cancel** to issue without email.
4. Use **Download PDF / Print** if you need a copy.

> - Changing the status to Selected or Not selected asks whether to email the person.
> - A certificate is issued only once per intern.
> - Deleting an intern also deletes their resume.

## Attendance and leave

**Leave requests:**

- Waiting requests have an amber border.
- Press **Approve**, **Approve as unpaid** or **Don't approve**, with an optional note. The employee gets an email.

**Monthly attendance:**

- Click a day to mark **Present**, **Half day** or **Absent (no pay)**.
- Choose **Automatic** to use leave and check-ins instead.

**Holidays and leave rules:**

- Choose **Present unless marked** or **By check-in**.
- Set weekly offs, leave types (days per year, paid or unpaid) and holidays.
- Press **Save**.

> Employees must be added in **Payslips → Employees** before they appear here.

## Payslips

**Add employees once:**

1. In **Employees**, press **Add employee**.
2. Fill in their details and salary. Use **Quick fill from monthly gross** to split it into Basic, HRA and Special.
3. Add deductions (PF, ESI, professional tax, TDS).
4. Press **Email staff portal invite** so they can log in at `/staff`.

**Run monthly payroll:**

1. Pick the **Month** and press **Make payslips**.
2. Open any payslip shown in amber (fewer paid days) and check it. Use **Update from attendance** if needed.
3. Press **Issue and email all**.

> - Issued payslips are locked. **Edit again** cancels the old verification code, and a new one is given when you issue again.
> - Salary changes apply only to payslips made after the change.

## HR letters

Make letters with a verification QR code:

- **Hiring:** Job offer, Appointment.
- **Internship:** Internship offer, Internship completion.
- **During employment:** Confirmation, Salary increment, Promotion.
- **Leaving:** Experience certificate, Relieving letter.
- **Certificates:** Salary certificate, Employment verification, Recommendation, NOC.

Press **Guide: which letter when** for help choosing.

**Make an offer letter:**

1. Press **New letter**, then **Job offer letter**.
2. Fill in the person, the details and the **Salary break-up** (**Fill from CTC**).
3. Press **Save** and check the preview.
4. Press **Email to person**. This also issues the letter.

> - Drafts carry a DRAFT mark until issued.
> - To cancel an issued letter, **Revoke** it rather than deleting it. The verify page will then show it as no longer valid.
> - Company details and signatures come from **Billing details**.

## Certificates

Design the internship certificate and see every certificate issued.

- Edit the **Title** and **Main text**. You can use `{name}`, `{role}`, `{company}`, `{start}` and `{end}`.
- Add up to 3 signers (name, designation, signature image), then press **Save certificate**.
- New certificates are issued from **Interns**.
- Anyone can check a certificate at `/verify` using its number.

> Signature images look best as transparent PNGs.

# Website pages {#pages}

## Home page

Choose which sections show on the home page, in what order, and the heading above each one.

1. Under **Sections on the home page**, press **Shown** to switch a section to **Hidden**, or back.
2. Use the arrows to change the order. The hero always stays first.
3. Edit the **Heading** and **Short line** for each section, and the **Tools** strip (names separated by commas).
4. Press **Save and publish**.

> A hidden section keeps its content and can be shown again at any time.

## Homepage hero

The big first block of the home page. A live **Preview** at the top shows your changes as you make them.

**Seven designs:**

| Design | Looks like |
|---|---|
| Live build | Text on the left, an animated browser building sites on the right |
| Centred | Big centred headline on a moving dot grid |
| Photo split | Text on the left, a large photo with a stat card on the right |
| Full screen photo | Photo or video across the whole screen with white text |
| Work tiles | Headline above tiles of your latest projects |
| Dark aurora | Dark background with moving coloured light |
| Big type | Very large headline with a band of moving services |

**Change the hero:**

1. Click a design card. The preview updates straight away.
2. Edit the **Keyword line**, **Headline**, **Highlight words** and **Supporting text**.
3. Set the two buttons. Leave a button's text empty to hide it.
4. Add a **Photo** if the design uses one (at least 1600 px wide). For Full screen photo, use **Darkness over the photo** to keep the text readable.
5. Press **Save and publish**.

> - The **Keyword line** is part of the main page heading on Google. Put your main search phrase there.
> - Highlight words must appear exactly in the headline.

## Page headers and Page banners

- **Page headers:** the **Heading** and **Intro text** at the top of About, Services, Products, Work, Contact, Internship, Blog and Careers.
- **Page banners:** the large image behind each of those headings, plus a fallback cover photo for blog posts that don't have their own.

## About and stats

**About section:** **Heading**, **Main text**, **Highlighted note** and **Image**.

**Numbers:** press **Add number** and enter a **Value** (for example 50+) and a **Label**.

> - Use real numbers only.
> - The first numbers also appear in the hero (with **Show 2 stats** on) and in the Company profile PDF.

## Careers (jobs)

1. Tick **Accepting job applications**.
2. Write the intro and **Why work with us**.
3. Press **Add job** and fill in the **Job title**, **Type**, **Location**, **Experience**, **Salary** (optional), **What they'll do** and **Requirements**.
4. Press **Save and publish**.

Applications arrive in **Interns → Job applicants**.

## Internship

- Tick or untick **Accepting applications**. When unticked, the form is hidden and a "closed" message shows.
- Edit the **Intro text**, **What interns get**, **Duration options** and **Work mode options**.
- Press **Add role** to add an internship role, with **Role name**, **What they'll do** and **Skills needed**.

Applications arrive in **Interns** automatically.

## City pages (local SEO)

One page per city (for example `/website-development-jaipur`) to show up in local Google searches.

1. Press **Add city**. Fill in the **City**, **Main heading**, **Intro**, **Google title** and **Google description**.
2. Add the local numbers, 4–6 services for that city, the areas you serve, nearby cities and FAQs.
3. Tick **Show on website**, then press **Save and publish**.

> **Write each city page in its own words.** Google ignores pages that only swap the city name. Add only cities where you really work.

# Website content {#content}

## Services

Your services show on the home page and on `/services`, and each one gets its own detail page.

1. Press **Add service** and enter the **Name**, **One-line summary**, **Description**, **Highlights** and **Image**.
2. Set the **Page address**, **Page title for Google** (under 60 characters) and **Description for Google** (140–160 characters).
3. Fill in **What you get**, **Page text** and **FAQs**.
4. Press **Save and publish**.

> - **Page text** formatting: `##` for headings, `-` for lists, `**bold**`.
> - **FAQs:** the question on one line, the answer on the next, and a blank line between pairs.

## Projects

Your portfolio. The first 6 projects show on the home page, all of them on `/work`, and each can have its own case study page.

**Add a website project:**

1. Press **Add project**. Enter the **Project name** and set **Category** to a service name (for example Website Development).
2. Set **Show as** to *Website / app (laptop + phone)*, or leave it on Auto.
3. Upload the **Cover image**, a **Full-page screenshot** (it scrolls inside the laptop) and a **Mobile screenshot**.
4. Add the **Live link** and **Results** (for example "Leads per month: 40 → 180").
5. For a case study page, fill in **The challenge**, **What we did**, **The result** and the client's words.
6. Press **Save and publish**.

**Show as frames:**

- Website / app
- Social media (Instagram profile)
- Video (wide or reel)
- Ads and marketing
- Graphic design
- E-commerce management
- On-demand app

> - Each field's hint says which frame uses it.
> - Leave **Client name** empty if the client wants to stay private.

## Products

Your own software or SaaS. Each product gets a page at `/products/…` with a **Book a demo** form.

- Fill in the **Product name**, **One-line pitch**, **Status** (Live, Beta, Coming soon or Don't show), **Price**, **Cover screenshot**, more screenshots, **Key features**, demo and YouTube links, page text and FAQs.
- The Products menu link appears once you add the first product.
- Demo requests arrive in **Leads**.

## Industries, Process steps and Testimonials

- **Industries:** the "Who we work with" section. Each has a **Name**, **Description**, **Key points** and **Image**.
- **Process steps:** the steps of how you work, in order. Each has a **Name**, **Time**, **Description** and **What the client gets**. Each step keeps its picture by position.
- **Testimonials:** press **Add testimonial** and fill in **Client name**, **Role and company**, **What they said**, **Stars** and an optional photo. Use real client quotes only. Without a photo, the client's initials are shown.

## Trusted by (clients)

A strip of client logos or names just below the hero.

1. Press **Add client** for 4–5 clients. The logo is optional; a transparent PNG looks best.
2. Tick **Show the client logo strip** and write the line above the logos.
3. Optionally tick **Show the rating** and enter your Google rating and number of reviews.
4. Press **Save and publish**.

> Only add clients who are happy for their name to be shown.

## Goal picker and Project planner

- **Goal picker:** the "I want to…" choices on the home page. Each goal has **Button text**, **Sentence ending**, **What we'd do** and **Related service ids**. Copy the ids exactly from the list at the top of the section.
- **Project planner:** the time estimator on the home page.
  - Set **Min days** and **Max days** for each service. Tick **Monthly** for ongoing services.
  - Add **Project sizes** with a **Multiplier** (1.5 means 50% longer) and **Extras**.
  - Enquiries from the planner arrive in **Leads**.

## Showreel video

- **Heading**, **Video URL** (MP4) and **Cover image**, for computers.
- **Phone video URL (portrait 9:16)** and **Phone cover image**, for phones.
- Leave the phone video empty to use the wide video everywhere.
- Show or hide the section from **Home page**.

## Company profile (PDF)

A printable company brochure at `/company-profile`.

1. Edit the **Cover page**, **About us page** and **Last page** text.
2. Tick the pages to include. Numbers, services, industries, process, projects and quotes are filled in from their own sections.
3. Press **Save and publish**, then **Download PDF**.

> Tick **Anyone with the link can open it** to show it in the website footer.

## Chatbot and FAQ

- Set the assistant's **Name** and **First message**.
- Press **Add question** and fill in the **Question**, **Answer** and **Keywords**. The chatbot matches what visitors type against the keywords.

> Add Hindi and Hinglish keywords too (kitna, kab, banwana) so more questions get an answer.

# Blog and media {#blog}

## Blog posts

Articles at `/blog` that help people find you on Google. Posts have their own **Save** and **Publish** buttons, not Save and publish.

**Publish a post:**

1. Press **New post** and type the **Post title**. The web address fills in automatically.
2. Write the **Summary** and the article. Use the toolbar for headings, bold, links, lists, quotes and images.
3. Upload a **Cover image** (1600 × 900, landscape) and fill in **Describe the photo**.
4. Set the **Category** and **Tags**. Optionally fill in the **SEO title** and **SEO description**.
5. Press **Preview**, then **Publish**.

> - **Save** keeps the post as a private draft.
> - A future **Publish date** schedules the post.
> - An empty SEO title or description uses the post title or summary instead.

## Media

The library of every uploaded image. The **Library** button on any picture field opens it.

- Drag photos in, or press **Choose images**. They save straight away.
- **Copy link** gives you an image's address.
- **Make old images smaller** speeds up pages that use old uploads.

> Deleting an image leaves a blank space wherever it was used on the site.

# Site settings {#settings}

## Logo and company name

**Company name**, **Tagline** (shown in the footer) and **Logo**. The logo is used in the menu, footer, intro, browser tab, admin panel and Company profile PDF.

## Contact details

**Email**, **Phone** (without +91), **WhatsApp number** (with country code, digits only), **Location**, and your Instagram, LinkedIn and YouTube links.

These details feed:

- the WhatsApp button
- lead emails
- the hero
- the Company profile PDF

## Colour theme

- Pick a ready-made theme: Lavender (Spinex), Ocean blue, Emerald, Sunset orange, Rose, Teal, Royal gold or Graphite.
- Or set your own **Main colour** and **Dark colour**. Lighter and darker shades are made automatically.
- **Back to Spinex lavender** resets the colours.
- Press **Save and publish** to put the new colours on the website.

## Intro & cursor

**Intro animation:**

- Turn it on or off with **Show the intro**.
- Pick a style: Logo reveal, Loading counter, Big letters, Split doors, Circle burst, Code typing, Stripes or Minimal.
- Choose when it shows, on which pages, the speed, the text and the colours.

**Between pages:** an animation when moving between pages. Choose None, Fade, Curtain, Colour wipe or Logo flash.

**Mouse cursor:**

- Tick **Show the custom cursor on desktop**.
- Pick a style: Dot and ring, Soft dot, Invert or Glow.
- Choose the **Cursor colour**.
- The custom cursor never shows on phones or tablets.

> If the intro plays on every visit, **Minimal** is the best choice. Visitors who turned on "reduce motion" don't see the intro or the custom cursor.

## SEO

- **Google search result:** the home page **Page title** (under 60 characters), **Description** (140–160 characters) and **Keywords**, with a live preview.
- **Verification codes:** **Google verification code** and **Bing verification code**. You can paste the whole `<meta>` tag.
- **IndexNow:** **Tell Bing when pages change (IndexNow)** keeps Bing, ChatGPT search and Copilot up to date.
- **Home page text for search:** the **Heading**, **Text** and **Cities you serve**.
- **Quick links:** Sitemap, Robots and llms.txt.

> Services, products, projects, city pages and blog posts each have their own Google title and description fields.

## WhatsApp and analytics

Only the owner or an admin can change these.

- **Floating WhatsApp button:** on or off, and the message filled in for the visitor.
- **Cookie banner:** on or off, and its text. While it is on, tracking runs only for visitors who press Accept.
- **Analytics:**
  - **Google Analytics 4 ID** (starts with G-)
  - **Microsoft Clarity project ID**
  - **Meta (Facebook) Pixel ID**
  - **Google Tag Manager ID**

  Paste the ID and press **Save and publish**. Leave a field empty to turn that tool off.

# Admin and security {#security}

## Team and roles (owner only)

**Add a team member:**

1. Press **Add member**. Enter their **Name** and **Email**, and choose **Start from a role**.
2. Set a **Password** of at least 8 characters, then press **Add member**.
3. Share the login details privately. They log in at `/admin`.

**On each member, you can:**

- Click the role to fine-tune each area, then press **Save access**.
- **Block** them.
- Turn off their two-step login if they lost their phone.
- Reset their password.
- Remove them.

> Access changes apply on the person's next click. They don't need to log in again.

## API keys (owner only)

Connect outside services:

- **Email alerts (SMTP)**
- **WhatsApp alerts**
- **Razorpay** payments
- **Leads from ads**
- **Google Calendar**
- **Google reviews**
- **AI chatbot**
- **Spam protection**
- **Webhook**

Most of these have a **Send test** button. Press **Save keys** when done.

> - Keys are stored encrypted. Only the last 4 characters are shown after saving.
> - **Custom code on every page:** paste code here only from services you trust.

## Automation (owner only)

The scheduler behind every automatic reminder and backup.

- **Scheduler:** shows whether it is **Working**, and the private scheduler link.
- **Follow-up reminders:** the daily list of leads to follow up, with an optional WhatsApp summary.
- **AMC renewal reminders:** set how many days before the end of a plan to remind.
- **Automatic database backup:**
  - Choose how often, and the email it goes to.
  - **Email a backup now** or **Download backup now**.
  - **Restore from a backup:** you must type RESTORE to confirm. A safety copy is saved first.
- **Uptime monitoring:** the health check link.

> Without the scheduler, no reminders or automatic backups happen. Backups don't include images, API keys or passwords.

## Backup and restore

Saves or loads the **website content only** (text, images and settings) as `content.json`. Leads, invoices and other records are backed up in **Automation**.

- **Download content.json** before big changes.
- **Import content** replaces the live content. The current content is kept in History.
- **Restore defaults** brings back the original built-in content.

## History, Activity log and My account

- **History:** the last 40 saved versions of the website content. Press **Restore** to go back; the current version is kept so you can switch back. Blog posts, leads and interns are not included.
- **Activity log:** who changed what, newest first. Filter by area. Entries are kept for one year.
- **My account:** your own login security.
  - **Recovery email:** the inbox where "Forgot password?" sends the reset link. Set a real Gmail here if your login email is not a real inbox. On the login page you can type either email.
  - Turn on two-step login: scan the QR code with Google Authenticator, type the code, press **Turn on**.
  - Save your backup codes somewhere safe, not on the same phone. **Make codes** creates new ones and stops the old ones working.
  - **Change password.**

> **Recommended:** turn on two-step login for every admin account.

# Quick answers {#faq}

## Everyday tasks

| I want to… | Go to |
|---|---|
| Call a new enquiry | **Leads** → open the lead → **Call** |
| Send a quotation | **Leads** → **Make quotation**, or **Quotes and invoices** → **New quotation** |
| Mark a payment as received | **Quotes and invoices** → open the invoice → **Payment received** → **Save** |
| Add a finished website to the portfolio | **Projects** → **Add project** |
| Publish a blog article | **Blog posts** → **New post** → **Publish** |
| Change the phone number or email | **Contact details** |
| Change the logo | **Logo and company name** |
| Change the top of the home page | **Homepage hero** |
| Hide a home page section | **Home page** → **Shown/Hidden** |
| Add a client review | **Client feedback** → **Approve**, or **Testimonials** → **Add testimonial** |
| Post a job | **Careers (jobs)** → **Add job** |
| Give a certificate to an intern | **Interns** → set Completed → **Issue certificate** |
| Run salaries | **Payslips** → **Make payslips** → **Issue and email all** |
| Give a staff member a login | **Team and roles** → **Add member** |
| Undo a wrong website change | **History** → **Restore** |

## If something goes wrong

- **My change isn't on the website.** Did you press **Save and publish**? Then refresh the website with Ctrl + Shift + R (or pull down to refresh on a phone).
- **"Not saved" message.** Someone else saved while you were editing. Press **Reload**, then make your change again.
- **"View only" banner.** Your role can't change this section. Ask the owner to update your access in **Team and roles**.
- **An image won't upload.** Keep it under about 4 MB and use JPG, PNG or WebP.
- **Reminders or review requests aren't going out.** Check that **Automation** says the scheduler is **Working**.
- **Emails aren't arriving.** Check **API keys → Email alerts** and press **Send test email**.
- **I'm locked out.** Use **Forgot password?** on the login page. The link goes to the **Recovery email** set in **My account** (or the login email if none is set). For two-step login, use a backup code, or ask the owner to turn it off for you.

> **Need help?** Contact Spinex IT Solutions at **spinexitsolutions@gmail.com**.
