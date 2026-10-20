import type { SiteContent } from "./content";

export type Block = string | { list: string[] };
export type LegalSection = { id: string; title: string; body: Block[] };
export type LegalDoc = { slug: "privacy" | "terms" | "refund"; title: string; summary: string; updated: string; sections: LegalSection[] };

// Update this date whenever the text below changes.
export const LEGAL_UPDATED = "20 October 2026";

const who = (c: SiteContent) => `${c.brand.name} ("Spinex", "we", "us"), ${c.contact.location}`;
// Tracking tools switched on in Admin → Integrations (Google Analytics and Clarity can also come from
// NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_CLARITY_ID).
const trackers = (c: SiteContent) => {
  const i = c.integrations;
  return {
    ga: !!(i?.gaId?.trim() || process.env.NEXT_PUBLIC_GA_ID?.trim()),
    clarity: !!(i?.clarityId?.trim() || process.env.NEXT_PUBLIC_CLARITY_ID?.trim()),
    pixel: !!i?.metaPixelId?.trim(),
    gtm: !!i?.gtmId?.trim(),
  };
};

const reach = (c: SiteContent) => `email ${c.contact.email} or call/WhatsApp +91 ${c.contact.phone}`;

export function privacyPolicy(c: SiteContent): LegalDoc {
  const t = trackers(c);
  const analytics = [t.ga && "Google Analytics", t.clarity && "Microsoft Clarity"].filter(Boolean).join(" and ");
  const ads = [t.pixel && "the Meta Pixel (Facebook and Instagram)", t.gtm && "Google Tag Manager"].filter(Boolean).join(" and ");
  return {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "What personal data we collect through this website, why we collect it, how long we keep it and the rights you have under the Digital Personal Data Protection Act, 2023.",
    updated: LEGAL_UPDATED,
    sections: [
      {
        id: "who-we-are",
        title: "Who we are",
        body: [
          `This website is run by ${who(c)}. We are the Data Fiduciary for the personal data described in this policy.`,
          `For any privacy question or request, ${reach(c)}.`,
        ],
      },
      {
        id: "what-we-collect",
        title: "What we collect",
        body: [
          "We only collect what you choose to give us through the forms on this website:",
          {
            list: [
              "Enquiry forms (Contact page, home page and project planner): your name, phone number, email if you give it, the services you are interested in, budget range, your message and any project plan you build.",
              "Internship applications: your name, email, phone, city, college and course, the role you apply for, preferred duration and work mode, portfolio link, your answer to why you want to join, and your resume (PDF) if you upload one.",
              "Job applications (Careers page): your name, email, phone, city, the role you apply for, your experience, portfolio or LinkedIn link, your answer to why you want to join, and your resume (PDF) if you upload one.",
              "Chat assistant: the questions you type. If our AI provider is switched on, your messages are sent to it only to produce a reply.",
              "Interns who join us: start and end dates, the work done and the certificate issued to you.",
            ],
          },
          "We do not ask for financial details, government ID numbers or sensitive personal data through this website.",
          "Like any website, our hosting provider automatically records basic technical data such as IP address, browser type and the pages requested. This is used for security and to keep the site running.",
        ],
      },
      {
        id: "why",
        title: "Why we use it",
        body: [
          {
            list: [
              "To reply to your enquiry, prepare a quote and deliver the services you ask for.",
              "To review internship and job applications, contact applicants and manage internships.",
              "To issue internship certificates and let others check that a certificate is genuine.",
              "To keep records required by law, resolve disputes and protect against fraud or misuse.",
            ],
          },
          `We process your data on the basis of your consent, which you give when you submit a form, and for legitimate uses permitted by law. We do not sell your personal data${
            t.pixel || t.gtm ? ". We use website visit data to measure and improve our own advertising (see Cookies and similar storage)." : " and we do not use it for advertising."
          }`,
        ],
      },
      {
        id: "certificates",
        title: "Certificate verification",
        body: [
          "Each internship certificate carries a unique number and a QR code. Anyone who enters that number on our Verify page can see the intern's name, role, internship dates and issue date. No phone number, email or other contact detail is shown.",
          "If you are an intern and do not want your certificate to be publicly verifiable, write to us and we will discuss the options with you.",
        ],
      },
      {
        id: "sharing",
        title: "Who we share it with",
        body: [
          "We use a small number of trusted service providers who process data on our behalf and only for the purposes above:",
          {
            list: [
              "Website hosting provider, which runs this website.",
              "Cloudflare Turnstile, which checks that forms are filled by people and not bots.",
              "MongoDB Atlas, where enquiries, applications, resumes and certificate records are stored.",
              "Google (Gmail), which sends us email alerts about new enquiries and applications.",
              "Anthropic, which powers the chat assistant when it is switched on.",
              ...(analytics ? [`${analytics}, to help us understand how the website is used.`] : []),
              ...(t.pixel ? ["Meta (Facebook and Instagram), through the Meta Pixel, to measure and improve our ads."] : []),
              ...(t.gtm ? ["Google, through Google Tag Manager, which loads our measurement and advertising tags."] : []),
              "WhatsApp and your email app, only when you choose to contact us that way.",
            ],
          },
          "Images on this website are stored on our own site. Some pages show a map from Google Maps; loading it may share your IP address with Google under its own privacy policy.",
          "We may disclose data if required by law, a court order or a government authority.",
          "Some providers may store data on servers outside India. Where this happens we rely on their security commitments and on transfers permitted under Indian law.",
        ],
      },
      {
        id: "retention",
        title: "How long we keep it",
        body: [
          {
            list: [
              "Enquiries: up to 3 years after our last contact with you, then deleted.",
              "Internship and job applications not taken forward: up to 1 year, then deleted along with the resume.",
              "Intern records and certificate details: kept for as long as the certificate needs to be verifiable.",
              "Records we must keep under tax or other laws: for the period the law requires.",
            ],
          },
          "You can ask us to delete your data earlier at any time (see Your rights).",
        ],
      },
      {
        id: "security",
        title: "How we protect it",
        body: [
          "Data is sent over encrypted connections (HTTPS). The admin area is protected by a password and a secure login session, and only authorised Spinex staff can access personal data. Resumes are not publicly accessible.",
          "No system is completely secure. If a personal data breach occurs we will inform affected people and the Data Protection Board of India as required by law.",
        ],
      },
      {
        id: "cookies",
        title: "Cookies and similar storage",
        body: [
          t.pixel || t.gtm
            ? "The public website may store a small setting in your browser so the opening animation shows only once per visit."
            : "The public website does not use advertising cookies. It may store a small setting in your browser so the opening animation shows only once per visit.",
          "The admin area uses one essential login cookie, only for Spinex staff.",
          ...(analytics
            ? [`We use ${analytics} to understand how visitors use the website, such as which pages are viewed and how long people stay. These tools set cookies and receive technical data like your IP address and device type. You can block these cookies in your browser settings.`]
            : t.pixel || t.gtm
              ? []
              : ["If we add analytics tools in the future, we will update this policy first."]),
          ...(ads
            ? [`We use ${ads} to measure visits and form submissions that come from our ads and to show our ads to people who visited this website. These tools set cookies (including advertising cookies) and receive technical data like your IP address, device type and the pages you view. You can block these cookies in your browser settings, and manage ad preferences in your Meta (Facebook, Instagram) and Google account settings.`]
            : []),
          ...((analytics || ads) && c.integrations?.cookieBanner
            ? ["When you first visit, a banner asks whether you accept these cookies. The tools above load only if you press Accept, and you can change your choice at any time from \"Cookie settings\" at the bottom of every page."]
            : []),
        ],
      },
      {
        id: "rights",
        title: "Your rights",
        body: [
          "Under the Digital Personal Data Protection Act, 2023 you can:",
          {
            list: [
              "Ask what personal data we hold about you and how it is used.",
              "Ask us to correct, complete or update your data.",
              "Withdraw your consent and ask us to delete your data, unless the law requires us to keep it.",
              "Nominate another person to exercise these rights if you die or become unable to do so.",
              "Raise a grievance with us, and if it is not resolved, with the Data Protection Board of India.",
            ],
          },
          `To use any of these rights, ${reach(c)}. We will reply within 30 days.`,
        ],
      },
      {
        id: "children",
        title: "Applicants under 18",
        body: [
          "Our services are meant for adults. If you are under 18 and want to apply for an internship, a parent or legal guardian must apply with you and give consent. We will ask for this before processing the application. If we learn that we hold a child's data without such consent, we will delete it.",
        ],
      },
      {
        id: "grievance",
        title: "Grievance Officer",
        body: [
          `Grievance Officer, ${c.brand.name}`,
          `Email: ${c.contact.email}`,
          `Phone: +91 ${c.contact.phone}`,
          `Address: ${c.contact.location}`,
          "We acknowledge grievances within 48 hours and aim to resolve them within 30 days.",
        ],
      },
      {
        id: "changes",
        title: "Changes to this policy",
        body: ["We may update this policy from time to time. The date at the top shows when it last changed. Important changes will be highlighted on this page."],
      },
    ],
  };
}

export function termsOfService(c: SiteContent): LegalDoc {
  return {
    slug: "terms",
    title: "Terms of Service",
    summary: "The rules for using this website and the general terms on which we provide our services. Your signed proposal or quote adds the details for your specific project.",
    updated: LEGAL_UPDATED,
    sections: [
      {
        id: "about",
        title: "About these terms",
        body: [
          `These terms apply to your use of this website and to services provided by ${who(c)}.`,
          "By using the website or engaging us for a project, you agree to these terms. If a written proposal, quote or agreement for your project says something different, that document applies for that project.",
        ],
      },
      {
        id: "services",
        title: "Our services",
        body: [
          `We provide ${c.services.map((s) => s.title.toLowerCase()).join(", ")} and related digital services.`,
          "The exact scope, deliverables, timeline and price for each project are set out in the written quote or proposal we share with you. Work not listed there is outside the scope and may be quoted separately.",
          "Timelines on the website, including the project planner, are estimates only and are not a commitment.",
        ],
      },
      {
        id: "client",
        title: "What we need from you",
        body: [
          {
            list: [
              "Accurate information and timely feedback, approvals and content (text, images, logins, product details).",
              "Confirmation that you own or have permission to use any content, logos or material you give us.",
              "Payments on time as per the quote or invoice.",
            ],
          },
          "Delays in content, feedback or payment can move the delivery date. If a project is on hold for more than 30 days because we are waiting on you, we may treat the current stage as complete and invoice for it.",
        ],
      },
      {
        id: "payments",
        title: "Quotes and payments",
        body: [
          "Prices are in Indian Rupees and exclude GST and other taxes unless stated. Payment schedules (for example an advance and milestone payments) are set out in your quote or invoice.",
          "Third-party costs such as domain names, hosting, paid themes, plugins, stock media, software licences and advertising spend are billed separately and paid directly or reimbursed at actual cost.",
          "Refunds and cancellations are covered by our Refund & Cancellation Policy.",
        ],
      },
      {
        id: "ownership",
        title: "Ownership of work",
        body: [
          "Once the project is paid for in full, you own the final deliverables created specifically for you, such as your website design, content we write for you and final graphics or videos.",
          "We keep ownership of our own tools, code libraries, templates and know-how that we use across projects, and you get a permanent licence to use them as part of your deliverables.",
          "Third-party items (fonts, plugins, themes, stock images) remain under their own licences.",
          "Unless you tell us otherwise in writing, we may show the finished work in our portfolio and on social media.",
        ],
      },
      {
        id: "revisions",
        title: "Revisions and support",
        body: [
          "The number of revision rounds and any support or maintenance period are set out in your quote. Further changes, new features or support after that period are charged separately.",
        ],
      },
      {
        id: "website-use",
        title: "Using this website",
        body: [
          "You may use this website for lawful purposes only. You must not try to break into, overload or misuse the website or its forms, submit false information, or copy its design and content for commercial use without permission.",
          "Information on the website is general and may change without notice. We try to keep it accurate but do not guarantee that it is complete or error-free.",
        ],
      },
      {
        id: "internships",
        title: "Internships and certificates",
        body: [
          "Internship roles, duration and any stipend are confirmed in writing when an applicant is selected. Applying does not guarantee selection.",
          "Certificates are issued only to interns who complete the internship as agreed. A certificate can be checked on our Verify page using its number. Altering or misusing a certificate is not allowed, and we may cancel certificates obtained or used dishonestly.",
        ],
      },
      {
        id: "liability",
        title: "Limits of our responsibility",
        body: [
          "We deliver our work with reasonable skill and care. We do not guarantee specific business results such as search rankings, sales, leads or follower numbers, because these depend on factors outside our control.",
          "We are not responsible for problems caused by third-party services (hosting, payment gateways, social media platforms, plugins) or by changes made by anyone other than us.",
          "To the extent the law allows, our total liability for any claim relating to a project is limited to the amount you paid us for that project. We are not liable for indirect losses such as loss of profit or data.",
        ],
      },
      {
        id: "termination",
        title: "Ending a project",
        body: [
          "Either side may end a project by giving written notice. You pay for work completed up to that date and any third-party costs already incurred, as set out in the Refund & Cancellation Policy. We hand over completed work once those amounts are paid.",
        ],
      },
      {
        id: "law",
        title: "Governing law and disputes",
        body: [
          "These terms are governed by the laws of India. We will first try to resolve any dispute through discussion. If that does not work within 30 days, the courts at Jaipur, Rajasthan will have exclusive jurisdiction.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        body: [`For any question about these terms, ${reach(c)}.`],
      },
    ],
  };
}

// "a, b and c"
const joinAnd = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

// Services marked "monthly" in the project planner (Admin → Planner), by their titles on the site.
const monthlyServices = (c: SiteContent) => {
  const times = Array.isArray(c.planner?.times) ? c.planner.times : [];
  const services = Array.isArray(c.services) ? c.services : [];
  const titles = times
    .filter((t) => t?.monthly)
    .map((t) => services.find((sv) => sv.id === t.id)?.title?.trim())
    .filter((x): x is string => !!x);
  return Array.from(new Set(titles));
};

export function refundPolicy(c: SiteContent): LegalDoc {
  const monthly = monthlyServices(c);
  const monthlyText = monthly.length
    ? `${joinAnd([...monthly, "maintenance plans"])} are billed monthly and can be cancelled with 15 days' written notice before the next billing date. Fees for the current month are not refundable.`
    : "Maintenance plans and other monthly services can be cancelled with 15 days' written notice before the next billing date. Fees for the current month are not refundable.";
  return {
    slug: "refund",
    title: "Refund & Cancellation Policy",
    summary: "How cancellations and refunds work for our services. Your quote may set different terms for your project, and those terms apply where they differ.",
    updated: LEGAL_UPDATED,
    sections: [
      {
        id: "overview",
        title: "Overview",
        body: [
          "Our work is custom-made for each client, so refunds depend on how much work has been done when a project is cancelled. This policy applies to payments made to Spinex for website development, e-commerce, design, video, social media and marketing services.",
        ],
      },
      {
        id: "cancel-before",
        title: "Cancelling before work starts",
        body: [
          "If you cancel in writing before we start work (before the first design, draft or planning deliverable is shared), we refund the advance in full, minus any payment gateway or bank charges.",
        ],
      },
      {
        id: "cancel-during",
        title: "Cancelling during a project",
        body: [
          {
            list: [
              "Payments for stages that are completed or in progress are not refundable.",
              "Payments made in advance for stages that have not started are refunded.",
              "Any third-party costs already paid on your behalf are deducted.",
            ],
          },
          "We share the work completed up to the cancellation date once the amounts due are settled.",
        ],
      },
      {
        id: "monthly",
        title: "Monthly services",
        body: [
          monthlyText,
        ],
      },
      {
        id: "non-refundable",
        title: "Not refundable",
        body: [
          {
            list: [
              "Domain names, hosting, paid themes, plugins, software licences and stock media bought for your project.",
              "Advertising spend already paid to platforms such as Meta or Google.",
              "Work that has been delivered and approved by you.",
            ],
          },
        ],
      },
      {
        id: "our-side",
        title: "If we cannot deliver",
        body: [
          "If we are unable to deliver the agreed work for reasons on our side, we will refund payments for the parts not delivered.",
        ],
      },
      {
        id: "how",
        title: "How to request a refund",
        body: [
          `Send your request to ${c.contact.email} with your name, project name and payment details. We confirm the amount within 7 working days. Approved refunds are paid to the original payment method within 7 to 10 working days after that.`,
        ],
      },
      {
        id: "internships",
        title: "Internships",
        body: ["Any fee or stipend related to an internship is confirmed in writing when you are selected. If anyone asks you for money in Spinex's name without a written offer from us, please report it to us before paying."],
      },
      {
        id: "contact",
        title: "Contact",
        body: [`For any question about cancellations or refunds, ${reach(c)}.`],
      },
    ],
  };
}

export const legalDocs = { privacy: privacyPolicy, terms: termsOfService, refund: refundPolicy };
