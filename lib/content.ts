import published from "./content.json";

export type Service = {
  id: string;
  title: string;
  short: string;
  description: string;
  tags: string[];
  image: string;
  // Detail page (/services/<slug>)
  slug: string;
  seoTitle: string;
  seoDescription: string;
  body: string; // Markdown
  features: string[];
  faqs: string; // "Question" line, "Answer" line, blank line between pairs
};

export type Job = { id: string; title: string; type: string; location: string; experience: string; salary: string; description: string; requirements: string[] };

import type { ProjectDisplay } from "./project-display";
export { PROJECT_DISPLAYS, projectDisplay, type ProjectDisplay } from "./project-display";

export type Project = {
  id: string;
  title: string;
  type?: "client" | "demo"; // demo = made to show our skills, not for a client
  category: string;
  summary: string;
  image: string;
  url: string;
  display?: ProjectDisplay | "";
  screen?: string; // website: full-page screenshot · e-commerce: seller dashboard · on-demand: admin panel
  mobile?: string; // website: mobile screenshot · on-demand: customer app
  partner?: string; // on-demand: partner app
  video?: string; // YouTube or .mp4 link
  videoShape?: "wide" | "reel";
  images?: string[]; // social posts, design pieces, ad creative, product photos
  results?: string[]; // "Label: value", e.g. "Leads per month: 40 → 180"
  handle?: string; // @account or brand name
  platforms?: string[]; // marketplaces for e-commerce management
  items?: string[]; // e-commerce products: "Name | price | note"
};



export type Industry = {
  id: string;
  title: string;
  description: string;
  image: string;
  points: string[];
};

export type Testimonial = { id: string; name: string; role: string; quote: string };

export type Faq = { id: string; q: string; a: string; keywords: string[] };

export type Stat = { id: string; value: string; label: string };

export type ProcessStep = { id: string; title: string; time: string; text: string; gets: string[] };
export type Goal = { id: string; short: string; label: string; steps: string[]; services: string[] };
export type Heading = { heading: string; intro: string };
export type PageText = { title: string; intro: string };
export type HomeBlock = { id: string; visible: boolean };

// Home page sections that can be shown, hidden and reordered from the admin panel.
export const HOME_BLOCKS: Record<string, string> = {
  marquee: "Tools strip",
  services: "Services",
  why: "Why Spinex",
  process: "Process",
  work: "Projects",
  showreel: "Showreel video",
  industries: "Who we work with",
  goals: "Goal picker",
  testimonials: "Testimonials",
  planner: "Project planner",
  blog: "Latest articles",
  seo: "SEO text",
  faq: "FAQ",
  contact: "Contact section",
};

export type Signer = { id: string; name: string; title: string; image: string };

export type InternRole = { id: string; title: string; description: string; skills: string[] };

// Our own software and SaaS, shown on /products.
export type Product = {
  id: string;
  name: string;
  slug: string; // /products/<slug>
  tagline: string; // one line under the name
  description: string; // short paragraph for cards and Google
  category: string; // e.g. "WhatsApp marketing", "CRM"
  audience: string; // who it is for
  status: string; // "Live", "Beta", "Coming soon"
  image: string; // cover screenshot
  gallery: string[]; // more screenshots (image links)
  features: string[];
  price: string; // e.g. "₹2,999/month" or "Price on request"
  demoUrl: string; // live demo link (optional)
  videoUrl: string; // YouTube link (optional)
  body: string; // Markdown, page text
  faqs: string; // Q line, A line, blank line between
  seoTitle: string;
  seoDescription: string;
};

export const productSlug = (p: Pick<Product, "slug" | "name" | "id">) =>
  (p.slug || p.name || p.id).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || p.id;

export type PlanTime = { id: string; min: number; max: number; monthly: boolean }; // id = service id, days
export type PlanSize = { id: string; label: string; hint: string; factor: number };
export type PlanExtra = { id: string; label: string; days: number };
export type PlannerSettings = { times: PlanTime[]; sizes: PlanSize[]; extras: PlanExtra[]; note: string };

import type { ThemeSettings } from "./theme";

export type SiteContent = {
  theme: ThemeSettings;
  planner: PlannerSettings;
  removedServices: string[]; // built-in service ids the admin deleted on purpose
  brand: { name: string; logo: string; tagline: string };
  hero: { kicker: string; title: string; subtitle: string; primaryCta: string; secondaryCta: string };
  sections: {
    services: Heading; why: Heading; process: Heading; work: Heading; industries: Heading; goals: Heading;
    planner: Heading; blog: Heading; faq: Heading; contact: Heading; tools: string[];
  };
  process: ProcessStep[];
  goals: Goal[];
  pages: { about: PageText; services: PageText; products: PageText; work: PageText; contact: PageText; internship: PageText; blog: PageText; careers: PageText };
  homeLayout: HomeBlock[];
  seo: { metaTitle: string; metaDescription: string; keywords: string[]; heading: string; text: string; areas: string[] };
  about: { title: string; body: string; philosophy: string; image: string };
  stats: Stat[];
  services: Service[];
  projects: Project[];
  products: Product[];
  industries: Industry[];
  testimonials: Testimonial[];
  showreel: { title: string; video: string; poster: string };
  banners: { about: string; services: string; products: string; work: string; contact: string; internship: string; blog: string; careers: string };
  certificate: { title: string; body: string; verifyUrl: string; signers: Signer[] };
  careers: { open: boolean; intro: string; perks: string[]; jobs: Job[] };
  integrations: { whatsappButton: boolean; whatsappText: string; gaId: string; clarityId: string; metaPixelId: string; gtmId: string };
  internship: { open: boolean; intro: string; modes: string[]; durations: string[]; perks: string[]; roles: InternRole[] };
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
    location: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
  chatbot: { name: string; greeting: string; faqs: Faq[] };
};

// Stock photos live in public/images/stock (run `npm run offline-images` once to download them).
const img = (id: string, _w = 1400) => `/images/stock/${id}.jpg`;

const baseContent: SiteContent = {
  theme: { preset: "lavender", accent: "#6E59D9", dark: "#120F1B" },
  planner: {
    times: [
      { id: "web", min: 7, max: 14, monthly: false },
      { id: "ecommerce", min: 0, max: 0, monthly: true },
      { id: "marketing", min: 0, max: 0, monthly: true },
      { id: "social", min: 0, max: 0, monthly: true },
      { id: "video", min: 2, max: 5, monthly: false },
      { id: "design", min: 3, max: 7, monthly: false },
      { id: "ondemand", min: 30, max: 60, monthly: false },
      { id: "promotion", min: 0, max: 0, monthly: true },
    ],
    sizes: [
      { id: "s", label: "Small", hint: "Up to 5 pages or 20 products", factor: 1 },
      { id: "m", label: "Medium", hint: "5–15 pages or up to 100 products", factor: 1.5 },
      { id: "l", label: "Large", hint: "15+ pages or 100+ products", factor: 2.2 },
    ],
    extras: [
      { id: "payments", label: "Online payments", days: 2 },
      { id: "booking", label: "Booking or appointments", days: 3 },
      { id: "admin", label: "Admin panel", days: 4 },
      { id: "blog", label: "Blog", days: 2 },
      { id: "multilang", label: "Hindi + English", days: 4 },
      { id: "seo", label: "SEO setup", days: 2 },
    ],
    note: "A rough estimate. We confirm the exact timeline and price after a short call.",
  },
  removedServices: [],
  brand: {
    name: "Spinex IT Solutions",
    logo: "/brand/logo.png",
    tagline: "Websites, stores and content that help brands grow.",
  },
  hero: {
    kicker: "IT company in Jaipur, serving all of India",
    title: "We build the websites, stores and content your business runs on.",
    subtitle:
      "Spinex IT Solutions builds fast business websites, Shopify and WooCommerce stores, and runs SEO, social media, ads and video for brands in Jaipur and across India.",
    primaryCta: "Start your project",
    secondaryCta: "See our work",
  },
  sections: {
    services: { heading: "What we do, done properly.", intro: "One team for your website, store, ads, social and video, so everything looks and works like one brand." },
    why: { heading: "Built like software, not just designed.", intro: "Try it: switch screen sizes, run a speed test, run the code." },
    process: { heading: "From first call to launch.", intro: "Four clear stages. You always know what's next." },
    work: { heading: "Work we're proud of.", intro: "" },
    industries: { heading: "Who we work with.", intro: "Different businesses need different things. Keep scrolling to see what we build for each." },
    goals: { heading: "Not sure where to start?", intro: "" },
    planner: { heading: "Plan your project in a minute.", intro: "Pick what you need and see the scope and a rough timeline. Send it to us and we'll reply with an exact quote." },
    blog: { heading: "Ideas and guides.", intro: "Practical tips on websites, online stores and marketing for growing businesses." },
    faq: { heading: "Questions we get asked.", intro: "Don't see yours? Ask our assistant and get an answer right away." },
    contact: { heading: "Let's talk about your project.", intro: "Pick whatever is easiest for you. We usually reply within a day." },
    tools: ["Next.js", "React", "WordPress", "Shopify", "WooCommerce", "Figma", "Meta Ads", "Google Ads", "Premiere Pro", "After Effects", "Razorpay", "Google Analytics"],
  },
  process: [
    { id: "discover", title: "Discover", time: "1–2 days", text: "A short call to understand your business, customers and goals.", gets: ["Clear scope", "Timeline", "Written quote"] },
    { id: "design", title: "Design", time: "3–5 days", text: "We design the key screens and share them. Changes happen here, before any code.", gets: ["Key screen designs", "Mobile layouts", "Your feedback built in"] },
    { id: "build", title: "Build", time: "1–3 weeks", text: "We develop every page, connect payments and forms, and test on every device.", gets: ["All pages developed", "Payments and forms", "Tested on all devices"] },
    { id: "launch", title: "Launch", time: "Ongoing", text: "We go live, set up analytics and keep improving with support, SEO and campaigns.", gets: ["Site live on your domain", "Analytics set up", "Ongoing support"] },
  ],
  goals: [
    { id: "customers", short: "More customers", label: "get more customers from Google", steps: ["A fast website that shows up on Google", "Your Google Business Profile set up properly", "Ads that bring calls and WhatsApp enquiries"], services: ["web", "marketing"] },
    { id: "sell", short: "Sell online", label: "sell my products online", steps: ["Your products listed on Amazon, Flipkart and Meesho", "Orders, returns and ads managed for you", "Your own online store if you want one"], services: ["ecommerce", "web", "marketing"] },
    { id: "brand", short: "Look professional", label: "look more professional", steps: ["A logo and brand look you're proud of", "A clean website that builds trust", "Matching social media designs"], services: ["design", "web"] },
    { id: "instagram", short: "Grow on Instagram", label: "grow on Instagram", steps: ["A posting plan that fits your business", "Reels that people watch till the end", "Designs that look like one brand"], services: ["social", "video", "design"] },
    { id: "launch", short: "Launch a business", label: "launch a new business", steps: ["Logo, colours and brand look", "Website live from day one", "Social pages ready to post"], services: ["design", "web", "social"] },
    { id: "app", short: "Build an app", label: "build a booking or delivery app", steps: ["Customer app for easy booking and payment", "Partner app for jobs and earnings", "Admin panel to manage everything"], services: ["ondemand", "design"] },
    { id: "known", short: "Get known", label: "make my brand known", steps: ["Influencer and creator collaborations", "Launch campaigns on Instagram and YouTube", "WhatsApp offers to your customers"], services: ["promotion", "social", "video"] },
  ],
  pages: {
    about: { title: "A Jaipur studio that builds for results.", intro: "Design, development, marketing and video under one roof, so your brand looks and works the same everywhere." },
    services: { title: "Everything your brand needs online.", intro: "Pick one service or let us handle the whole thing. Either way you get one team and one point of contact." },
    products: { title: "Software we built and run.", intro: "Ready-made tools and SaaS products from the Spinex team. Ask for a free demo of any of them." },
    work: { title: "Projects we're proud of.", intro: "Websites, online stores, campaigns and films for businesses across India." },
    contact: { title: "Tell us what you're building.", intro: "Share a few details and we'll get back within a day with next steps and a quote." },
    internship: { title: "Start your career with real projects.", intro: "Internships in web development, design, video, social media and marketing. Learn by doing, alongside our team." },
    blog: { title: "Ideas and guides for growing online.", intro: "Practical articles on websites, online stores, SEO and social media, written by the Spinex team." },
    careers: { title: "Build great work with us.", intro: "We're a small Jaipur team that builds websites, stores and content for growing brands. See the open roles below." },
  },
  homeLayout: Object.keys(HOME_BLOCKS).map((id) => ({ id, visible: true })),
  seo: {
    metaTitle: "Spinex IT Solutions | IT Company in Jaipur, Serving All India",
    metaDescription:
      "Jaipur-based IT company serving businesses across India: websites, online stores, on-demand apps, SEO, ads, social media, video, design and brand promotion. Get a free quote.",
    keywords: [
      "IT company in Jaipur",
      "website development company in Jaipur",
      "website development company in India",
      "web design company Jaipur",
      "ecommerce website development",
      "Shopify developer India",
      "on-demand app development company",
      "digital marketing agency Jaipur",
      "digital marketing agency India",
      "SEO services Jaipur",
      "social media marketing agency",
      "brand promotion agency",
      "video editing services",
    ],
    heading: "An IT company in Jaipur, working with businesses across India",
    text: "Spinex IT Solutions is an IT and digital marketing company based in Jaipur, Rajasthan. We work with businesses all over India, from local shops and clinics to growing D2C brands and startups, and handle everything they need to grow online under one roof.\n\nWe design and build business websites, Shopify and WooCommerce stores, and on-demand apps for booking, delivery and services, complete with customer app, partner app and admin panel. Everything we build is fast, works well on mobile and is ready for Google from day one.\n\nOnce you are live, our team takes care of growth: SEO, Google Business Profile, Google and Meta ads, social media management, reels and video editing, graphic design, brand promotion with influencers and launch campaigns, and complete e-commerce management for sellers on Amazon, Flipkart and Meesho.\n\nClients outside Jaipur work with us online through video calls, WhatsApp updates and shared progress links, and get the same team and the same quality. Every project starts with a free call and a clear written quote.",
    areas: ["Jaipur", "Delhi NCR", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Indore", "Lucknow", "Chandigarh", "Surat", "Udaipur", "Jodhpur", "Kota"],
  },
  about: {
    title: "Logic and creativity, in equal measure.",
    body: "We don't stop at a good-looking homepage. Every site we ship is built for speed, search and conversion, from the first line of code to the last pixel. You get one team for design, development, marketing and content, so nothing gets lost between agencies.",
    philosophy:
      "We remove what isn't needed and focus on what moves the numbers: load time, clarity and a path that turns visitors into enquiries.",
    image: img("photo-1522071820081-009f0129c71c"),
  },
  stats: [
    { id: "s1", value: "8", label: "Services under one roof" },
    { id: "s2", value: "24 hrs", label: "Usual reply time" },
    { id: "s3", value: "All India", label: "Clients served online" },
    { id: "s4", value: "Free", label: "First call and quote" },
  ],
  services: [
    {
      id: "web",
      title: "Web development",
      short: "Custom-coded and WordPress sites that load fast and rank.",
      description:
        "Custom-coded websites and WordPress builds that are fast, secure and SEO-ready. We set up hosting, analytics and forms so your site starts working the day it goes live.",
      tags: ["Custom code", "WordPress", "React / Next.js"],
      image: img("photo-1498050108023-c5249f4df085"),
      slug: "website-development",
      seoTitle: "Website Development Company in Jaipur | Spinex IT Solutions",
      seoDescription: "Custom websites and WordPress sites in Jaipur that load fast, rank on Google and bring enquiries. Free quote from Spinex IT Solutions.",
      features: ["Custom design for your brand", "Mobile-first and fast loading", "SEO-ready pages and Google Analytics", "Contact forms, WhatsApp and call buttons", "Easy to update admin panel", "Hosting, domain and SSL setup"],
      body: "Your website is often the first thing a customer checks before they call you. We build websites for Jaipur businesses that look professional, load in seconds on mobile data and are set up to show on Google.\n\n## What we build\n\n- Business and company websites\n- Landing pages for ads and campaigns\n- WordPress websites you can update yourself\n- Custom Next.js and React websites for startups\n\n## How it works\n\nWe start with a short call to understand your business and customers. You see the design before any code is written, so changes are quick. Once you approve it, we build, test on every screen size and launch on your domain.\n\n## Why businesses choose Spinex\n\nEvery site we deliver is fast, secure and ready for search from day one. You get one team for design, development and marketing, and you own your domain, code and content.",
      faqs: "How much does a website cost in Jaipur?\nIt depends on the number of pages and features. Share what you need and we send a clear written quote within a day.\n\nHow long does it take to build a website?\nA business website usually takes 1 to 2 weeks after we receive your content.\n\nWill I be able to update the website myself?\nYes. We give you an easy admin panel and show you how to change text and images.",
    },
    {
      id: "ecommerce",
      title: "E-commerce management",
      short: "We run your Amazon, Flipkart, Meesho and Shopify stores day to day.",
      description:
        "Complete e-commerce account management: listings, catalogue, pricing, orders, returns, ads and growth on Amazon, Flipkart, Meesho and your own Shopify store, handled by one team.",
      tags: ["Amazon & Flipkart", "Meesho", "Listings & ads"],
      image: img("photo-1556742049-0cfed4f6a45d"),
      slug: "ecommerce-management",
      seoTitle: "E-commerce Management Services | Amazon, Flipkart, Meesho",
      seoDescription: "E-commerce account management for Amazon, Flipkart, Meesho and Shopify sellers: listings, catalogue, orders, returns, ads and reports. Spinex IT Solutions, Jaipur, serving all India.",
      features: ["Seller account setup and verification", "Product listing and catalogue with SEO titles", "Pricing, stock and order management", "Returns, claims and account health", "Sponsored ads on every marketplace", "Weekly sales and profit reports"],
      body: "Selling online takes daily work: new listings, price changes, stock, orders, returns, claims and ads. We take that work off your hands so you can focus on your products, and you get one team for every marketplace.\n\n## What we manage\n\n- Seller accounts on Amazon, Flipkart, Meesho and your Shopify store\n- Product listings with search-friendly titles, photos and A+ content\n- Pricing, stock and order processing\n- Returns, claims and account health\n- Sponsored ads and sale events\n\n## Reports you can trust\n\nEvery week you get a simple report: orders, revenue, ad spend, returns and what we plan next. You always know where your money goes and what is working.\n\n## New to selling online?\n\nWe set up your seller accounts, get your brand registered, list your first products and set up your own Shopify store if you want one.",
      faqs: "Which marketplaces do you manage?\nAmazon, Flipkart, Meesho and Shopify stores. We can also help with other marketplaces on request.\n\nDo I need to give you my seller account login?\nWe work through the marketplace's official user access wherever possible, so you keep full control of your account.\n\nHow is e-commerce management priced?\nUsually a monthly fee based on the number of products and marketplaces, with ad spend paid separately. We share a clear quote after a short call.",
    },
    {
      id: "marketing",
      title: "Digital marketing",
      short: "Ads and campaigns measured by leads, not likes.",
      description:
        "Meta and Google ad campaigns planned around enquiries and sales. We set up tracking, test creatives and report what each rupee brought back.",
      tags: ["Meta ads", "Google ads", "Lead generation"],
      image: img("photo-1460925895917-afdab827c52f"),
      slug: "digital-marketing",
      seoTitle: "Digital Marketing Agency in Jaipur | Meta & Google Ads | Spinex",
      seoDescription: "Meta and Google ads, SEO and lead generation for businesses in Jaipur. Campaigns measured by enquiries and sales, not just likes.",
      features: ["Meta (Facebook and Instagram) ads", "Google Search and Maps ads", "SEO and Google Business Profile", "Landing pages for campaigns", "Conversion tracking setup", "Monthly reports in plain language"],
      body: "Marketing should bring calls, WhatsApp messages and sales, not just likes. We plan campaigns around the enquiries your business needs and track what each rupee brings back.\n\n## Our marketing services\n\n- Meta ads for Facebook and Instagram\n- Google ads for search and Google Maps\n- Local SEO and Google Business Profile\n- Lead generation campaigns with landing pages\n\n## How we work\n\nWe set up tracking first, so every lead is counted. Then we test creatives and audiences, keep what works and stop what doesn't. You get a simple monthly report that shows leads, cost per lead and what we'll do next.",
      faqs: "How much should I spend on ads?\nMany local businesses start with a small daily budget and increase it once results are clear. We suggest a budget after understanding your goals.\n\nHow soon will I see results from ads?\nAds can bring enquiries within the first week. SEO takes a few months to build.\n\nDo you work on a monthly plan?\nYes. Marketing is usually managed month to month.",
    },
    {
      id: "social",
      title: "Social media",
      short: "Instagram, LinkedIn and Facebook, handled end to end.",
      description:
        "Content calendars, posting, community replies and growth for Instagram, LinkedIn and Facebook. Your brand stays active and consistent without taking your time.",
      tags: ["Strategy", "Content", "Community"],
      image: img("photo-1611162617474-5b21e879e113"),
      slug: "social-media-marketing",
      seoTitle: "Social Media Marketing in Jaipur | Instagram Management | Spinex",
      seoDescription: "Instagram, Facebook and LinkedIn management in Jaipur: content calendars, posts, reels and replies, handled end to end by Spinex IT Solutions.",
      features: ["Monthly content calendar", "Post and reel design", "Captions and hashtags", "Posting and scheduling", "Replies to comments and messages", "Growth and insights report"],
      body: "Staying active on social media takes time every single day. We plan, create and post your content so your brand stays visible and consistent while you run your business.\n\n## What we handle\n\n- Content plan built around your offers and festivals\n- Designed posts, carousels and stories\n- Reels with editing and trending audio\n- Posting, comment replies and community care\n\n## Made for your audience\n\nWe study what your customers engage with and adjust every month. You approve the plan in advance, so nothing goes out without your okay.",
      faqs: "Which platforms do you manage?\nInstagram, Facebook and LinkedIn. We suggest the right mix for your business.\n\nHow many posts per month?\nPlans range from a few posts a week to daily content, depending on your goals.\n\nDo I need to give photos?\nYour own product and team photos work best, and we can also plan shoots and use designed graphics.",
    },
    {
      id: "video",
      title: "Video editing",
      short: "Reels, YouTube and ad edits that hold attention.",
      description:
        "Cinematic edits for Reels, Shorts, YouTube and ads, with motion graphics, colour grading and sound design that keep viewers watching to the end.",
      tags: ["Reels / Shorts", "Motion graphics", "Colour grading"],
      image: img("photo-1574717024653-61fd2cf4d44d"),
      slug: "video-editing",
      seoTitle: "Video Editing Services in Jaipur | Reels, YouTube & Ads | Spinex",
      seoDescription: "Professional video editing in Jaipur for Instagram reels, YouTube and ads, with motion graphics, colour grading and sound design.",
      features: ["Reels and Shorts editing", "YouTube video editing", "Ad films and promos", "Motion graphics and titles", "Colour grading", "Sound design and subtitles"],
      body: "Good editing keeps people watching till the end. We edit reels, YouTube videos and ads that hold attention and get your message across in the first few seconds.\n\n## What we edit\n\n- Instagram reels and YouTube Shorts\n- Long-form YouTube videos and podcasts\n- Product videos and ad films\n- Event highlights and brand stories\n\n## The Spinex touch\n\nClean cuts, captions people can read on mute, motion graphics that match your brand and colour grading that makes your footage look premium. Send us raw footage and we handle the rest.",
      faqs: "How fast is the turnaround?\nShort reels usually take 2 to 3 days. Longer videos depend on length and effects.\n\nDo you add subtitles?\nYes, in English or Hindi.\n\nCan you edit regularly every month?\nYes. We offer monthly editing plans for creators and brands.",
    },
    {
      id: "design",
      title: "Graphic design",
      short: "Logos, creatives and brand graphics with a point of view.",
      description:
        "Logos, social creatives, brochures and brand graphics that make you recognisable. Every design is made for where it will actually be seen.",
      tags: ["Logo design", "Social creatives", "Brand graphics"],
      image: img("photo-1561070791-2526d30994b5"),
      slug: "graphic-design",
      seoTitle: "Graphic Design and Logo Design in Jaipur | Spinex IT Solutions",
      seoDescription: "Logo design, brand identity, social media creatives and brochures in Jaipur that make your business look professional everywhere.",
      features: ["Logo and brand identity", "Social media creatives", "Brochures and flyers", "Packaging and labels", "Business cards and stationery", "Brand guidelines"],
      body: "A strong visual identity makes your business easy to recognise and trust. We design logos, brand graphics and marketing material that look right everywhere they appear.\n\n## What we design\n\n- Logos and complete brand identity\n- Social media posts and ad creatives\n- Brochures, flyers and menus\n- Packaging, labels and business cards\n\n## Designed with purpose\n\nEvery design starts with your audience and where it will be seen. You get a few concepts to choose from, then we refine your favourite and deliver all files ready for print and web.",
      faqs: "How many logo options do I get?\nWe share a few concepts, then refine the one you like best.\n\nWill I get the source files?\nYes. You receive print-ready and web-ready files, including editable formats.\n\nCan you match my existing brand?\nYes. Share your current logo and colours and we design within your brand.",
    },
    {
      id: "ondemand",
      title: "On-demand solutions",
      short: "Booking, delivery and service apps built around your business.",
      description:
        "Custom on-demand platforms like food delivery, home services, taxi or appointment booking. Customer app, partner app and admin panel, built to work together.",
      tags: ["Booking apps", "Delivery apps", "Admin panel"],
      image: img("photo-1512941937669-90a1b58e7e9c"),
      slug: "on-demand-app-development",
      seoTitle: "On-Demand App Development Company in Jaipur | Spinex IT Solutions",
      seoDescription: "On-demand app development in Jaipur: food delivery, home service, taxi and booking apps with customer app, partner app and admin panel. Get a free quote.",
      features: ["Customer app (Android and iOS)", "Partner or delivery app", "Admin panel and reports", "Online payments and wallet", "Live tracking and notifications", "Ratings, coupons and referrals"],
      body: "On-demand businesses run on speed and trust. Customers want to book in a few taps, partners need clear jobs, and you need one place to see everything. We build all three as one connected platform.\n\n## What we build\n\n- Food and grocery delivery apps\n- Home service booking, like salons, cleaning and repairs\n- Taxi, bike and logistics apps\n- Doctor, tutor and appointment booking\n- Rental and subscription platforms\n\n## One platform, three parts\n\n**Customer app** for browsing, booking, paying and tracking. **Partner app** for accepting jobs, navigation and earnings. **Admin panel** for orders, payouts, pricing, coupons and reports.\n\n## Built to grow\n\nWe start with the features you need to launch, then add more as your orders grow. Payments, maps, SMS and WhatsApp notifications are set up from day one.",
      faqs: "How long does an on-demand app take?\nA first version usually takes 1 to 2 months, depending on features and the number of apps.\n\nWill I get Android and iOS apps?\nYes. We build for both, plus a web admin panel to manage everything.\n\nCan you add features after launch?\nYes. Most clients launch with the essentials and add features like wallets, subscriptions or referrals later.",
    },
    {
      id: "promotion",
      title: "Brand promotion",
      short: "Campaigns that get your name seen and remembered.",
      description:
        "Influencer campaigns, launch promotions, WhatsApp and YouTube marketing that put your brand in front of the right people and keep it there.",
      tags: ["Influencer marketing", "Launch campaigns", "WhatsApp marketing"],
      image: img("photo-1556761175-5973dc0f32e7"),
      slug: "brand-promotion",
      seoTitle: "Brand Promotion Agency in Jaipur | Spinex IT Solutions",
      seoDescription: "Brand promotion in Jaipur: influencer marketing, product launch campaigns, YouTube and WhatsApp promotion that build awareness and bring customers.",
      features: ["Influencer marketing", "Product and store launch campaigns", "YouTube and Instagram promotion", "WhatsApp and SMS campaigns", "Local and event promotion", "Campaign reports"],
      body: "People buy from brands they know. Brand promotion makes sure the right people see your name often enough to remember it, and trust it when they are ready to buy.\n\n## How we promote your brand\n\n- Influencer collaborations with creators your customers follow\n- Launch campaigns for new products, stores and offers\n- YouTube and Instagram promotion with reels and short videos\n- WhatsApp and SMS campaigns to your customer list\n- Local promotion for events, openings and festive offers\n\n## Planned around your goal\n\nWe start with what you want: awareness, footfall, followers or sales. Then we pick the channels, creators and content that fit your budget, and share clear reports on reach and results.",
      faqs: "Do you work with influencers in Jaipur?\nYes. We work with local and national creators and pick ones whose audience matches your customers.\n\nWhat budget do I need for brand promotion?\nCampaigns can start small and scale up. We suggest a plan after understanding your goal.\n\nHow do I know the campaign worked?\nYou get a report with reach, views, clicks and enquiries for every campaign.",
    },
  ],
  projects: [], // Real projects are added in Admin → Projects.
  products: [], // Our own software, added in Admin → Products.
  industries: [
    {
      id: "local",
      title: "Local business",
      description: "Show up when people nearby search, and turn those searches into calls.",
      image: "/images/industries/local-business.webp",
      points: ["Local SEO and Google Business Profile", "WhatsApp and call buttons", "Reviews shown where they help"],
    },
    {
      id: "ecom",
      title: "E-commerce",
      description: "Sellers on Amazon, Flipkart, Meesho and their own online stores.",
      image: "/images/industries/ecommerce.webp",
      points: ["Marketplace account management", "Listings, ads and orders", "Shopify stores and payments"],
    },
    {
      id: "creators",
      title: "Creators and coaches",
      description: "Portfolios and landing pages for influencers, coaches and artists.",
      image: "/images/industries/creators-coaches.webp",
      points: ["Personal brand sites", "Course and booking pages", "Reels and YouTube editing"],
    },
    {
      id: "startups",
      title: "Startups",
      description: "MVP launches and company sites that look ready from day one.",
      image: "/images/industries/startups.webp",
      points: ["Fast MVP websites", "Pitch-ready brand design", "Analytics from launch"],
    },
  ],
  testimonials: [],
  banners: {
    about: img("photo-1556761175-5973dc0f32e7", 1600),
    services: img("photo-1531297484001-80022131f5a1", 1600),
    products: "/images/banners/products.jpg",
    work: img("photo-1519389950473-47ba0277781c", 1600),
    contact: img("photo-1497366216548-37526070297c", 1600),
    internship: img("photo-1522071820081-009f0129c71c", 1600),
    blog: img("photo-1504384308090-c894fdcc538d", 1600),
    careers: img("photo-1519389950473-47ba0277781c", 1600),
  },
  certificate: {
    title: "Certificate of Internship",
    body: "has successfully completed an internship as {role} at {company} from {start} to {end}, and showed dedication, discipline and a strong willingness to learn.",
    verifyUrl: "spinexwebsolutions.in/verify",
    signers: [
      { id: "sg1", name: "Palak Pareek", title: "Founder", image: "" },
      { id: "sg2", name: "Supriya Banetiya", title: "E-commerce and Operations", image: "" },
      { id: "sg3", name: "Shiva Pareek", title: "Video and Creative", image: "" },
    ],
  },
  careers: {
    open: true,
    intro: "Join a small team that ships real work for real clients every week. Tell us about yourself even if no role below fits; we keep good profiles on file.",
    perks: ["Real client projects from day one", "Learn across design, code and marketing", "Small team, quick decisions", "Office in Jaipur"],
    jobs: [
      { id: "j-web", title: "Web Developer", type: "Full-time", location: "Jaipur (on-site)", experience: "1–3 years", salary: "", description: "Build and maintain client websites and online stores using WordPress, Shopify and React/Next.js.", requirements: ["HTML, CSS, JavaScript", "WordPress or Shopify", "React or Next.js is a plus"] },
      { id: "j-social", title: "Social Media Executive", type: "Full-time", location: "Jaipur (on-site)", experience: "0–2 years", salary: "", description: "Plan content calendars, write captions and manage client Instagram and Facebook pages.", requirements: ["Strong Instagram knowledge", "Good writing in English and Hindi", "Basic Canva skills"] },
    ],
  },
  integrations: {
    whatsappButton: true,
    whatsappText: "Hi Spinex, I found you on your website and want to know more.",
    gaId: "",
    clarityId: "",
    metaPixelId: "",
    gtmId: "",
  },
  internship: {
    open: true,
    intro: "Learn by working on real client projects with our team. Pick a role, apply in two minutes, and we'll get back to you.",
    modes: ["In office (Jaipur)", "Remote", "Either is fine"],
    durations: ["1 month", "2 months", "3 months", "6 months"],
    perks: ["Work on real client projects", "Learn directly from the team", "Build a portfolio you can show", "Flexible for students"],
    roles: [
      { id: "r-web", title: "Web development", description: "Build and update websites with HTML, CSS, JavaScript, React or WordPress.", skills: ["HTML and CSS", "JavaScript basics", "WordPress or React"] },
      { id: "r-design", title: "Graphic design", description: "Design social posts, logos and brand graphics for real clients.", skills: ["Canva or Photoshop", "Illustrator or Figma", "Eye for layout"] },
      { id: "r-video", title: "Video editing", description: "Edit reels, shorts and ad videos with clean cuts and motion graphics.", skills: ["Premiere Pro or CapCut", "After Effects basics", "Sense of pacing"] },
      { id: "r-social", title: "Social media", description: "Plan posts, write captions and help grow client Instagram pages.", skills: ["Instagram know-how", "Writing captions", "Content ideas"] },
      { id: "r-marketing", title: "Digital marketing", description: "Help run Meta and Google ad campaigns and track what works.", skills: ["Meta Ads basics", "Google Ads basics", "Comfort with numbers"] },
    ],
  },
  showreel: {
    title: "A look at what we make",
    video: "/showreel.mp4",
    poster: "/showreel-poster.jpg",
  },
  contact: {
    email: "spinexitsolutions@gmail.com",
    phone: "9509211852",
    whatsapp: "919509211852",
    location: "Jaipur, Rajasthan, India",
    instagram: "https://www.instagram.com/spinex_it_solutions/",
    linkedin: "https://in.linkedin.com/company/spinex-it-solutions",
    youtube: "https://www.youtube.com/@SpinexItSolutions1",
  },
  chatbot: {
    name: "Spinex Assistant",
    greeting:
      "Hi! I can tell you about our services, timelines and how to get started. What are you looking to build?",
    faqs: [
      {
        id: "f1",
        q: "How much does a website cost?",
        a: "It depends on pages, features and whether you need a store. Share what you need and we'll send a clear quote within a day, with no hidden charges.",
        keywords: ["price", "cost", "rate", "charges", "budget", "kitna", "paisa", "quote", "pricing"],
      },
      {
        id: "f2",
        q: "How long does it take?",
        a: "A business website usually takes 1 to 2 weeks. Online stores take 2 to 4 weeks depending on products and integrations.",
        keywords: ["time", "long", "days", "weeks", "kitne din", "timeline", "deadline", "when"],
      },
      {
        id: "f-app",
        q: "Do you build booking or delivery apps?",
        a: "Yes. We build on-demand apps like food delivery, home services, taxi and appointment booking, with a customer app, partner app and admin panel. A first version usually takes 1 to 2 months.",
        keywords: ["app", "booking", "delivery", "on demand", "on-demand", "uber", "zomato", "swiggy", "taxi", "android", "ios"],
      },
      {
        id: "f-promo",
        q: "Do you do brand promotion?",
        a: "Yes. We run influencer campaigns, launch promotions, YouTube and Instagram promotion and WhatsApp campaigns, planned around your goal and budget.",
        keywords: ["promotion", "promote", "influencer", "brand", "awareness", "launch", "whatsapp marketing", "youtube"],
      },
      {
        id: "f3",
        q: "Do you provide support after launch?",
        a: "Yes. We offer support and maintenance plans for updates, backups and security, and you can reach us on WhatsApp.",
        keywords: ["support", "maintenance", "after", "help", "update", "backup"],
      },
      {
        id: "f4",
        q: "Do you work with clients outside Jaipur?",
        a: "Yes. We're based in Jaipur and work with clients across India and abroad over calls and WhatsApp.",
        keywords: ["outside", "location", "where", "jaipur", "remote", "india", "office"],
      },
      {
        id: "f5",
        q: "Can you redesign my existing website?",
        a: "Yes. We can redesign it, speed it up and improve SEO while keeping your content and rankings safe.",
        keywords: ["redesign", "existing", "old", "revamp", "improve", "slow"],
      },
    ],
  },
};

const serviceBlank = { slug: "", seoTitle: "", seoDescription: "", body: "", features: [] as string[], faqs: "" };

// Web address of a service page: /services/<slug>
export const serviceSlug = (s: Pick<Service, "slug" | "title" | "id">) =>
  s.slug || s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || s.id;

// Merges saved content over a base, section by section, so fields added later still get values.

// Old built-in SEO text (Jaipur-only). If a saved site still has it unchanged, it is
// upgraded to the new all-India text; anything the admin wrote themselves is kept.
const OLD_SEO_DEFAULTS: Partial<Record<"metaTitle" | "metaDescription" | "heading" | "text", string>> & { areas: string[] } = {
  metaTitle: "Website Development Company in Jaipur | Spinex IT Solutions",
  metaDescription: "Spinex IT Solutions is a website development company in Jaipur. We build fast business websites and Shopify or WooCommerce stores, and handle SEO, social media, ads and video. Get a free quote.",
  heading: "Website development company in Jaipur",
  text: "Spinex IT Solutions is a Jaipur-based website development and digital marketing company. We design and build business websites, online stores and landing pages that load fast, work well on mobile and are ready for Google from day one.\n\nFor shops and brands that want to sell online, we set up Shopify and WooCommerce stores with payment gateways, cash on delivery and inventory. Once your site is live, our team can handle SEO, Google Business Profile, Meta and Google ads, social media management, reels and graphic design, so your brand looks the same everywhere.\n\nWe work with local businesses, clinics, coaching institutes, creators, e-commerce brands and startups in Jaipur, across Rajasthan and all over India. Every project starts with a free call and a clear written quote.",
  areas: ["Malviya Nagar", "Vaishali Nagar", "C-Scheme", "Mansarovar", "Raja Park", "Jagatpura", "Tonk Road", "Sitapura", "Sodala", "Bani Park", "Pratap Nagar", "Jhotwara"],
};

// Sample projects shipped with the first version. Untouched copies are removed
// automatically so only real projects added in the admin panel are shown.
const SAMPLE_PROJECTS: Record<string, string> = { p1: "Handloom brand online store", p2: "Clinic booking website", p3: "Café launch campaign", p4: "Coaching institute lead funnel", p5: "Real estate walkthrough films", p6: "Startup corporate site" };

// The first E-commerce service (store building). Fields a saved site still has unchanged
// are upgraded to E-commerce management; anything edited in the admin panel is kept.
const OLD_ECOMMERCE: Partial<Service> = {
  title: "E-commerce",
  short: "Shopify and WooCommerce stores built to convert.",
  description:
  "Online stores on Shopify or WooCommerce with smooth checkout, payment gateways, inventory and shipping set up properly. Designed so customers find, trust and buy.",
  tags: ["Shopify", "WooCommerce", "Payment gateways"],
  slug: "ecommerce-website-development",
  seoTitle: "E-commerce Website Development in Jaipur | Shopify & WooCommerce",
  seoDescription: "Shopify and WooCommerce online stores in Jaipur with payment gateway, COD and inventory set up. Start selling online with Spinex IT Solutions.",
  features: ["Shopify or WooCommerce store", "Razorpay, UPI and cash on delivery", "Product, stock and order management", "Shipping and delivery setup", "Fast mobile checkout", "Training to run your store"],
  body: "Selling online needs more than a nice-looking shop. Customers must find products quickly, trust the store and pay without friction. We build online stores that do all three.\n\n## What's included\n\n- Store setup on Shopify or WooCommerce\n- Product pages, categories and filters\n- Payment gateway, UPI and cash on delivery\n- Shipping rates, order emails and invoices\n\n## Built to sell\n\nWe design the store around how your customers shop on their phones: clear photos, simple checkout and fast pages. Once you go live, we can run ads and social media to bring buyers to your store.",
  faqs: "Shopify or WooCommerce, which is better?\nShopify is simpler to run and has monthly fees. WooCommerce has no platform fee and more control. We help you choose based on your products and budget.\n\nCan you add cash on delivery?\nYes. We set up COD along with Razorpay, UPI and cards.\n\nHow long does an online store take?\nUsually 2 to 4 weeks, depending on the number of products and integrations.",
};

export const LATER_SERVICES = ["ondemand", "promotion"];

export function mergeContent(base: SiteContent, saved: Partial<SiteContent>): SiteContent {
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof SiteContent)[]) {
    const value = saved?.[key];
    if (value === undefined || value === null) continue;
    const b = base[key];
    out[key] = Array.isArray(b) || typeof b !== "object" ? value : { ...b, ...(value as object) };
  }
  // Services saved before detail pages existed get the default detail text for the same id.
  out.services = (out.services as Service[]).map((sv) => ({ ...serviceBlank, ...(base.services.find((d) => d.id === sv.id) ?? {}), ...sv }));
  // Upgrade untouched old SEO defaults.
  const seo = { ...(out.seo as SiteContent["seo"]) };
  for (const k of ["metaTitle", "metaDescription", "heading", "text"] as const) {
    if (seo[k] === OLD_SEO_DEFAULTS[k]) seo[k] = base.seo[k];
  }
  if (seo.text === "Spinex IT Solutions is an IT and digital marketing company based in Jaipur, Rajasthan. We work with businesses all over India, from local shops and clinics to growing D2C brands and startups, and handle everything they need to grow online under one roof.\n\nWe design and build business websites, Shopify and WooCommerce stores, and on-demand apps for booking, delivery and services, complete with customer app, partner app and admin panel. Everything we build is fast, works well on mobile and is ready for Google from day one.\n\nOnce you are live, our team takes care of growth: SEO, Google Business Profile, Google and Meta ads, social media management, reels and video editing, graphic design, and brand promotion with influencers and launch campaigns.\n\nClients outside Jaipur work with us online through video calls, WhatsApp updates and shared progress links, and get the same team and the same quality. Every project starts with a free call and a clear written quote.") seo.text = base.seo.text;
  if (Array.isArray(seo.areas) && seo.areas.join("|") === OLD_SEO_DEFAULTS.areas.join("|")) seo.areas = base.seo.areas;
  out.seo = seo;
  out.projects = (out.projects as Project[]).filter((pr) => SAMPLE_PROJECTS[pr.id] !== pr.title);
  // Placeholder numbers from the first version are swapped for honest defaults;
  // stats the admin has edited are kept as they are.
  const OLD_STATS: Record<string, string> = { "100+": "Projects delivered", "98%": "Client satisfaction", "24/7": "Support", "250%": "Avg. visibility lift" };
  out.stats = (out.stats as SiteContent["stats"]).map((st, i) => (OLD_STATS[st.value] === st.label ? base.stats[i] ?? st : st));
  out.chatbot = {
    ...(out.chatbot as SiteContent["chatbot"]),
    faqs: (out.chatbot as SiteContent["chatbot"]).faqs.map((f) =>
      f.a === "Yes. We offer 24/7 support and maintenance plans for updates, backups and security." ? { ...f, a: base.chatbot.faqs.find((x) => x.id === f.id)?.a ?? f.a } : f,
    ),
  };
  // Logo used to load from the old website; it now ships with this site.
  const brand = out.brand as SiteContent["brand"];
  if (!brand.logo || /spinexwebsolutions\.in\/img\/d\.png/i.test(brand.logo)) out.brand = { ...brand, logo: base.brand.logo };
  // Old LinkedIn page saved in the admin panel → new company page.
  const ct = out.contact as SiteContent["contact"];
  if (!ct.linkedin || /linkedin\.com\/company\/spinex-web-solutions/i.test(ct.linkedin)) out.contact = { ...ct, linkedin: base.contact.linkedin };
  // Old YouTube channel link → new channel.
  const yt = out.contact as SiteContent["contact"];
  if (!yt.youtube || /youtube\.com\/@SpiNexITSolutions\/?$/.test(yt.youtube)) out.contact = { ...yt, youtube: base.contact.youtube };
  // Old Instagram handle → new account.
  const ig = out.contact as SiteContent["contact"];
  if (!ig.instagram || /instagram\.com\/spinex\.websolutions\/?$/i.test(ig.instagram)) out.contact = { ...ig, instagram: base.contact.instagram };
  // Old company email saved in the admin panel → new one.
  const contact = out.contact as SiteContent["contact"];
  if (contact.email?.trim().toLowerCase() === "info.spinexwebsolutions@gmail.com") out.contact = { ...contact, email: base.contact.email };
  const hero = out.hero as SiteContent["hero"];
  if (hero.kicker === "Website development company in Jaipur") out.hero = { ...hero, kicker: base.hero.kicker };
  // Planner timings: keep saved values, add defaults for services that have none yet.
  const pl = out.planner as SiteContent["planner"];
  const savedTimes = (Array.isArray(pl.times) ? pl.times : []).map((t) =>
    t.id === "ecommerce" && t.min === 14 && t.max === 28 && !t.monthly ? { ...t, min: 0, max: 0, monthly: true } : t,
  );
  out.planner = { ...pl, times: [...savedTimes, ...base.planner.times.filter((t) => !savedTimes.some((x) => x.id === t.id))] };
  out.services = (out.services as Service[]).map((sv) => {
    if (sv.id !== "ecommerce") return sv;
    const fresh = base.services.find((d) => d.id === "ecommerce");
    if (!fresh) return sv;
    const next = { ...sv } as Record<string, unknown>;
    for (const [k, v] of Object.entries(OLD_ECOMMERCE)) {
      if (JSON.stringify(next[k]) === JSON.stringify(v)) next[k] = (fresh as Record<string, unknown>)[k];
    }
    return next as Service;
  });
  // Services added to the defaults later (on-demand, brand promotion) also show up on sites
  // whose service list was already saved in the admin panel.
  if (Array.isArray(saved?.services)) {
    const list = out.services as Service[];
    for (const id of LATER_SERVICES) {
      const d = base.services.find((x) => x.id === id);
      if (d && !list.some((x) => x.id === id) && !(saved.removedServices ?? []).includes(id)) list.push(d);
    }
  }
  return out as SiteContent;
}

// lib/content.json holds content exported from the admin panel; it overrides the built-in defaults.
export const defaultContent: SiteContent = mergeContent(baseContent, published as Partial<SiteContent>);
