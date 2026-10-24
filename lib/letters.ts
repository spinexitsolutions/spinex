// HR letters (offer letters, experience letters, certificates …). Shared by server routes and admin screens.
//
// Each letter type has its own fields and a default wording. The wording is plain text with:
//   {{field}}                 → the field's value (dates and amounts are written out nicely)
//   {{#field}} … {{/field}}   → only shown when the field is filled
//   {{^field}} … {{/field}}   → only shown when the field is empty
//   ## Heading, "- " bullet lines, **bold**, blank line = new paragraph

import { amountInWords } from "./billing";

export type FieldKind = "text" | "date" | "money" | "textarea" | "select";
export type FieldSpec = { key: string; label: string; kind: FieldKind; options?: string[]; hint?: string; placeholder?: string; wide?: boolean; initial?: string };

export type LetterGroup = "Hiring" | "During employment" | "Leaving" | "Internship" | "Certificates";

export type LetterTemplate = {
  code: string; // used in the reference number: SPX/OL/2026/001
  label: string;
  group: LetterGroup;
  help: string;
  toWhom?: boolean; // "To whom it may concern" instead of the person's address
  acceptance?: boolean; // signature block for the person to accept
  salary?: boolean; // can carry a salary break-up table
  fields: FieldSpec[];
  subject: string;
  body: string;
};

const WORK_MODES = ["Work from office", "Remote (work from home)", "Hybrid"];

const f = {
  role: { key: "role", label: "Internship role", kind: "text", placeholder: "e.g. Web Development Intern" } as FieldSpec,
  designation: { key: "designation", label: "Designation", kind: "text", placeholder: "e.g. Junior Web Developer" } as FieldSpec,
  department: { key: "department", label: "Department / team", kind: "text", placeholder: "e.g. Development" } as FieldSpec,
  joiningDate: { key: "joiningDate", label: "Date of joining", kind: "date" } as FieldSpec,
  startDate: { key: "startDate", label: "Start date", kind: "date" } as FieldSpec,
  endDate: { key: "endDate", label: "End date", kind: "date" } as FieldSpec,
  lastDate: { key: "lastDate", label: "Last working day", kind: "date" } as FieldSpec,
  ctc: { key: "ctc", label: "Annual CTC (₹)", kind: "money", placeholder: "e.g. 300000" } as FieldSpec,
  location: { key: "location", label: "Work location", kind: "text", initial: "Jaipur, Rajasthan" } as FieldSpec,
  workMode: { key: "workMode", label: "Work mode", kind: "select", options: WORK_MODES, initial: WORK_MODES[0] } as FieldSpec,
  workHours: { key: "workHours", label: "Working hours", kind: "text", initial: "10:00 AM to 6:00 PM, Monday to Saturday" } as FieldSpec,
  reportingTo: { key: "reportingTo", label: "Reporting to", kind: "text", placeholder: "e.g. Rohit Sharma, Project Manager" } as FieldSpec,
  probation: { key: "probation", label: "Probation (months)", kind: "text", initial: "6" } as FieldSpec,
  noticePeriod: { key: "noticePeriod", label: "Notice period (after confirmation)", kind: "text", initial: "30 days" } as FieldSpec,
  acceptBy: { key: "acceptBy", label: "Accept by", kind: "date", hint: "Last date to accept the offer" } as FieldSpec,
  purpose: { key: "purpose", label: "Purpose (optional)", kind: "text", placeholder: "e.g. a bank loan application" } as FieldSpec,
};

export const LETTER_TEMPLATES: Record<string, LetterTemplate> = {
  internship_offer: {
    code: "IO", label: "Internship offer letter", group: "Internship", help: "Offer an internship with dates, stipend and rules.", acceptance: true,
    fields: [f.role, f.department, f.startDate, f.endDate, { key: "stipend", label: "Stipend per month (₹)", kind: "money", hint: "Leave empty for an unpaid internship" }, f.workMode, f.location, f.workHours, f.reportingTo, f.acceptBy],
    subject: "Offer of internship",
    body: `Dear {{firstName}},

We are pleased to offer you an internship with **{{company}}** as **{{role}}**{{#department}} in the {{department}} team{{/department}}. We liked your skills and enthusiasm, and we look forward to working with you.

## Internship details
- Start date: {{startDate}}
- End date: {{endDate}}
- Work mode: {{workMode}}{{#location}}, {{location}}{{/location}}
- Working hours: {{workHours}}
{{#reportingTo}}- Reporting to: {{reportingTo}}
{{/reportingTo}}- Stipend: {{#stipend}}{{stipend}} per month{{/stipend}}{{^stipend}}This is an unpaid internship{{/stipend}}

## Terms
- You will work on live projects with our team and complete the tasks given to you on time.
- You will keep all company and client information confidential, during and after the internship.
- All work you create during the internship belongs to {{company}}.
- Either side may end the internship with 7 days' written notice.
- On successful completion, you will receive an internship certificate.

Please sign and return a copy of this letter{{#acceptBy}} by {{acceptBy}}{{/acceptBy}} to confirm that you accept this offer.

We wish you a great learning experience with us.`,
  },

  job_offer: {
    code: "OL", label: "Job offer letter", group: "Hiring", help: "Offer a job with CTC, joining date and salary break-up.", acceptance: true, salary: true,
    fields: [f.designation, f.department, f.joiningDate, f.ctc, f.location, f.workMode, f.reportingTo, f.probation, f.noticePeriod, f.acceptBy],
    subject: "Offer of employment",
    body: `Dear {{firstName}},

Further to your interview with us, we are pleased to offer you the position of **{{designation}}**{{#department}} in the {{department}} department{{/department}} at **{{company}}**.

## Offer details
- Date of joining: {{joiningDate}}
- Annual CTC: {{ctc}}
- Location: {{location}}{{#workMode}} ({{workMode}}){{/workMode}}
{{#reportingTo}}- Reporting to: {{reportingTo}}
{{/reportingTo}}- Probation: {{probation}} months
- Notice period: {{noticePeriod}}

{{#hasSalary}}The salary break-up is given in the annexure. {{/hasSalary}}A detailed appointment letter will be given to you when you join.

This offer is subject to the documents you have shared being correct and a satisfactory background check. On the day of joining, please bring your original educational certificates, ID proof, PAN card, and the relieving letter from your last employer (if any).

Please sign and return a copy of this letter{{#acceptBy}} by {{acceptBy}}{{/acceptBy}} to confirm that you accept this offer. If we don't hear from you by then, this offer will lapse.

We look forward to welcoming you to the team.`,
  },

  appointment: {
    code: "AL", label: "Appointment letter", group: "Hiring", help: "Full terms of employment, given on joining.", acceptance: true, salary: true,
    fields: [f.designation, f.department, f.joiningDate, f.ctc, f.location, f.workHours, f.reportingTo, f.probation, f.noticePeriod],
    subject: "Letter of appointment",
    body: `Dear {{firstName}},

With reference to your application and our discussions, we are pleased to appoint you as **{{designation}}**{{#department}} in the {{department}} department{{/department}} of **{{company}}** with effect from {{joiningDate}}, on the following terms.

## Terms and conditions
- **Salary:** Your annual cost to company (CTC) will be {{ctc}}{{#hasSalary}}, as per the break-up in the annexure{{/hasSalary}}. Salary is paid monthly, after deduction of applicable taxes.
- **Probation:** You will be on probation for {{probation}} months from the date of joining. On good performance, your confirmation will be given in writing. The company may extend the probation if needed.
- **Place of work:** {{location}}. You may be asked to work from another place or remotely as work needs.
- **Working hours:** {{workHours}}.
{{#reportingTo}}- **Reporting:** You will report to {{reportingTo}}, or anyone the company names later.
{{/reportingTo}}- **Leave:** As per the company's leave policy.
- **Notice period:** During probation, either side may end the employment with 15 days' notice. After confirmation, the notice period is {{noticePeriod}}, or salary in place of notice.
- **Confidentiality:** You will not share any confidential information about the company, its clients or projects, during or after your employment.
- **Ownership of work:** All code, designs, content and documents you create during your employment belong to {{company}}.
- **Other work:** While working with us, you will not take up any other paid work without written permission.
- **Conduct:** You will follow the company's policies and code of conduct, as updated from time to time.

Please sign and return a copy of this letter to confirm that you accept these terms.

We welcome you to {{company}} and wish you a rewarding career with us.`,
  },

  confirmation: {
    code: "CF", label: "Confirmation letter", group: "During employment", help: "Confirms the job after probation.",
    fields: [f.designation, f.joiningDate, { key: "confirmationDate", label: "Confirmed from", kind: "date" }],
    subject: "Confirmation of employment",
    body: `Dear {{firstName}},

We are happy to inform you that, based on your performance during probation, your employment as **{{designation}}** with **{{company}}** is confirmed with effect from {{confirmationDate}}.

All other terms of your appointment remain the same.

Thank you for your good work. We look forward to your continued growth with us.`,
  },

  increment: {
    code: "IN", label: "Salary increment letter", group: "During employment", help: "New CTC from a date, with optional break-up.", salary: true,
    fields: [f.designation, { key: "effectiveDate", label: "Effective from", kind: "date" }, { key: "oldCtc", label: "Current annual CTC (₹)", kind: "money" }, { key: "newCtc", label: "New annual CTC (₹)", kind: "money" }],
    subject: "Revision of salary",
    body: `Dear {{firstName}},

In recognition of your performance and contribution, we are pleased to revise your annual CTC{{#oldCtc}} from {{oldCtc}}{{/oldCtc}} to **{{newCtc}}** with effect from {{effectiveDate}}.

{{#hasSalary}}The revised salary break-up is given in the annexure. {{/hasSalary}}All other terms of your employment remain the same.

Keep up the good work. We look forward to your continued success with {{company}}.`,
  },

  promotion: {
    code: "PR", label: "Promotion letter", group: "During employment", help: "New designation, with optional new CTC.",
    fields: [{ key: "oldDesignation", label: "Current designation", kind: "text" }, { key: "newDesignation", label: "New designation", kind: "text" }, { key: "effectiveDate", label: "Effective from", kind: "date" }, { key: "newCtc", label: "New annual CTC (₹, optional)", kind: "money" }, f.reportingTo],
    subject: "Promotion",
    body: `Dear {{firstName}},

We are delighted to inform you that you have been promoted from {{oldDesignation}} to **{{newDesignation}}** with effect from {{effectiveDate}}.

{{#newCtc}}Your revised annual CTC will be {{newCtc}}. {{/newCtc}}{{#reportingTo}}In your new role, you will report to {{reportingTo}}.{{/reportingTo}}

This promotion recognises your hard work and the value you bring to the team. Congratulations, and we wish you success in your new role.`,
  },

  experience: {
    code: "EX", label: "Experience letter", group: "Leaving", help: "Certifies the period and role of someone who worked here.", toWhom: true,
    fields: [f.designation, f.department, f.joiningDate, f.lastDate, { key: "summary", label: "Work done (optional)", kind: "textarea", wide: true, placeholder: "e.g. built and maintained client websites using React and Next.js" }],
    subject: "Experience certificate",
    body: `This is to certify that **{{fullName}}**{{#employeeId}} (Employee ID: {{employeeId}}){{/employeeId}} worked with **{{company}}** as **{{designation}}**{{#department}} in the {{department}} department{{/department}} from {{joiningDate}} to {{lastDate}}.

{{#summary}}During this period, {{firstName}}'s work included {{summary}}.

{{/summary}}We found {{firstName}} sincere, hardworking and professional, and {{firstName}}'s conduct during the employment was good.

We wish {{firstName}} every success in the future.`,
  },

  relieving: {
    code: "RL", label: "Relieving letter", group: "Leaving", help: "Confirms the resignation was accepted and the person is relieved.",
    fields: [f.designation, f.joiningDate, { key: "resignationDate", label: "Resignation date", kind: "date" }, f.lastDate],
    subject: "Relieving letter",
    body: `Dear {{firstName}},

This is with reference to your resignation dated {{resignationDate}}. We confirm that your resignation has been accepted, and you are relieved from your duties as **{{designation}}** at **{{company}}** at the close of working hours on {{lastDate}}.

You worked with us from {{joiningDate}} to {{lastDate}}. You have handed over your work and company property, and your full and final settlement will be done as per company policy.

Please note that the confidentiality terms of your appointment continue to apply.

Thank you for your contribution. We wish you success in the future.`,
  },

  internship_completion: {
    code: "IC", label: "Internship completion letter", group: "Internship", help: "Certifies that an internship was completed.", toWhom: true,
    fields: [f.role, f.startDate, f.endDate, { key: "project", label: "Work / projects (optional)", kind: "textarea", wide: true, placeholder: "e.g. a restaurant ordering website and the company's blog" }, { key: "mentor", label: "Mentor (optional)", kind: "text" }],
    subject: "Internship completion certificate",
    body: `This is to certify that **{{fullName}}** has successfully completed an internship with **{{company}}** as **{{role}}** from {{startDate}} to {{endDate}}.

{{#project}}During the internship, {{firstName}} worked on {{project}}. {{/project}}{{#mentor}}The internship was done under the guidance of {{mentor}}.{{/mentor}}

{{firstName}} was punctual, eager to learn and completed the work given with dedication. We wish {{firstName}} all the best for the future.`,
  },

  salary_certificate: {
    code: "SC", label: "Salary certificate", group: "Certificates", help: "Salary proof for loans, visas or rent.", toWhom: true, salary: true,
    fields: [f.designation, f.joiningDate, f.ctc, { key: "monthlyGross", label: "Monthly gross salary (₹)", kind: "money" }, f.purpose],
    subject: "Salary certificate",
    body: `This is to certify that **{{fullName}}**{{#employeeId}} (Employee ID: {{employeeId}}){{/employeeId}} has been working with **{{company}}** as **{{designation}}** since {{joiningDate}}.

{{firstName}}'s current annual CTC is {{ctc}}{{#monthlyGross}}, and the monthly gross salary is {{monthlyGross}}{{/monthlyGross}}.{{#hasSalary}} The salary break-up is given in the annexure.{{/hasSalary}}

This certificate is issued at {{firstName}}'s request{{#purpose}} for {{purpose}}{{/purpose}}.`,
  },

  employment_verification: {
    code: "EV", label: "Employment verification letter", group: "Certificates", help: "Confirms someone currently works here.", toWhom: true,
    fields: [f.designation, f.department, f.joiningDate, { key: "employmentType", label: "Type", kind: "select", options: ["full-time", "part-time", "contract"], initial: "full-time" }, f.purpose],
    subject: "Employment verification",
    body: `This is to certify that **{{fullName}}**{{#employeeId}} (Employee ID: {{employeeId}}){{/employeeId}} is working with **{{company}}** as **{{designation}}**{{#department}} in the {{department}} department{{/department}} on a {{employmentType}} basis since {{joiningDate}}.

This letter is issued at {{firstName}}'s request{{#purpose}} for {{purpose}}{{/purpose}}, and the company takes no financial responsibility through it.`,
  },

  recommendation: {
    code: "LR", label: "Letter of recommendation", group: "Certificates", help: "Recommends a past employee or intern.", toWhom: true,
    fields: [{ key: "role", label: "Role here", kind: "text" }, f.startDate, f.endDate, { key: "strengths", label: "What they did well", kind: "textarea", wide: true, placeholder: "e.g. Priya built our client dashboard on her own and trained two new interns." }, { key: "recommendFor", label: "Recommended for (optional)", kind: "text", placeholder: "e.g. a master's programme in computer science" }],
    subject: "Letter of recommendation",
    body: `I am pleased to recommend **{{fullName}}**, who worked with **{{company}}** as **{{role}}** from {{startDate}} to {{endDate}}.

{{#strengths}}{{strengths}}

{{/strengths}}In my experience, {{firstName}} is reliable, learns quickly and works well with the team. {{firstName}} takes ownership of the work and communicates clearly.

I recommend {{firstName}} without reservation{{#recommendFor}} for {{recommendFor}}{{/recommendFor}}. Please feel free to contact me for any further information.`,
  },

  noc: {
    code: "NC", label: "No objection certificate (NOC)", group: "Certificates", help: "For passport, visa, studies or other work.", toWhom: true,
    fields: [f.designation, f.joiningDate, { key: "purpose", label: "No objection to …", kind: "text", hint: "Finishes the sentence: “The company has no objection to Priya …”", placeholder: "applying for a passport" }],
    subject: "No objection certificate",
    body: `This is to certify that **{{fullName}}**{{#employeeId}} (Employee ID: {{employeeId}}){{/employeeId}} is working with **{{company}}** as **{{designation}}** since {{joiningDate}}.

The company has no objection to {{firstName}} {{purpose}}.

This certificate is issued at {{firstName}}'s request.`,
  },

  warning: {
    code: "WL", label: "Warning letter", group: "During employment", help: "Formal warning about conduct or performance.",
    fields: [f.designation, { key: "incidentDate", label: "Date of the issue (optional)", kind: "date" }, { key: "issue", label: "What happened", kind: "textarea", wide: true, placeholder: "e.g. You were absent without informing anyone on 3 days in October." }, { key: "expectation", label: "What we expect now", kind: "textarea", wide: true, placeholder: "e.g. inform your manager before taking leave" }, { key: "replyBy", label: "Reply by (optional)", kind: "date" }],
    subject: "Warning letter",
    body: `Dear {{firstName}},

This letter is about the following issue{{#incidentDate}} noticed on {{incidentDate}}{{/incidentDate}}:

{{issue}}

This is not acceptable under the company's policies and code of conduct.{{#expectation}} We expect you to {{expectation}}.{{/expectation}}

Please treat this as a formal warning. If this happens again, the company may take stricter action, which can include termination of employment.

{{#replyBy}}You may give your written explanation by {{replyBy}}.

{{/replyBy}}We hope you will take this seriously and improve.`,
  },

  termination: {
    code: "TM", label: "Termination letter", group: "Leaving", help: "Ends employment from a date, with the reason.",
    fields: [f.designation, f.lastDate, { key: "reason", label: "Reason", kind: "textarea", wide: true }],
    subject: "Termination of employment",
    body: `Dear {{firstName}},

We regret to inform you that your employment as **{{designation}}** with **{{company}}** ends with effect from {{lastDate}}.

{{#reason}}This decision has been taken for the following reason: {{reason}}

{{/reason}}Your full and final settlement, including any salary due, will be done as per company policy. Please return all company property, including your ID card, laptop, documents and account access, by {{lastDate}}.

Please note that the confidentiality terms of your appointment continue to apply.`,
  },
};

export const LETTER_TYPES = Object.keys(LETTER_TEMPLATES);
export const LETTER_GROUPS: LetterGroup[] = ["Hiring", "Internship", "During employment", "Leaving", "Certificates"];

export type LetterStatus = "draft" | "issued" | "revoked";
export const letterStatusLabel: Record<LetterStatus, string> = { draft: "Draft", issued: "Issued", revoked: "Revoked" };

export type SalaryRow = { id: string; label: string; monthly: number };
export type LetterPerson = { salutation: string; name: string; email: string; phone: string; address: string; employeeId: string };

export type Letter = {
  id: string;
  type: string;
  number: string; // SPX/OL/2026/001
  verifyCode: string; // SPX-L-7KQ2X9, printed with a QR code once issued
  status: LetterStatus;
  date: string; // yyyy-mm-dd
  person: LetterPerson;
  fields: Record<string, string>;
  subject: string;
  body: string;
  salary: SalaryRow[];
  signers: string[] | null; // ids of billing signers; null = the default ticks
  internId: string;
  token: string; // secret link for the person: /l/<token>
  issuedAt: string;
  sentAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type LetterSettings = { prefix: string; wording: Record<string, { subject: string; body: string }> };
export const defaultLetterSettings: LetterSettings = { prefix: "SPX", wording: {} };

export type LetterSigner = { id: string; name: string; title: string; image: string; show: boolean };
export type Letterhead = { legalName: string; address: string; phone: string; email: string; website: string; gstin: string; signers: LetterSigner[] };

// People who sign this letter: the ones picked on it, else the ones ticked "show by default" in Billing details.
export function letterSigners(l: Pick<Letter, "signers">, head: Letterhead): LetterSigner[] {
  const all = head.signers ?? [];
  return Array.isArray(l.signers) ? all.filter((x) => l.signers!.includes(x.id)) : all.filter((x) => x.show);
}

export const SALUTATIONS = ["", "Mr.", "Ms.", "Mx.", "Dr."];

export const blankPerson = (): LetterPerson => ({ salutation: "", name: "", email: "", phone: "", address: "", employeeId: "" });

export const templateFor = (type: string) => LETTER_TEMPLATES[type] ?? LETTER_TEMPLATES.job_offer;

// Starting values for a new letter of this type (wording from the saved defaults, if any).
export function initialFields(type: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const fl of templateFor(type).fields) out[fl.key] = fl.initial ?? "";
  return out;
}

// A simple break-up from the annual CTC: Basic 50%, HRA 25%, Special allowance 25% of the monthly amount.
export function salaryFromCtc(ctc: number): SalaryRow[] {
  const m = Math.round((Number(ctc) || 0) / 12);
  const basic = Math.round(m * 0.5);
  const hra = Math.round(m * 0.25);
  return [
    { id: "basic", label: "Basic salary", monthly: basic },
    { id: "hra", label: "House rent allowance (HRA)", monthly: hra },
    { id: "special", label: "Special allowance", monthly: m - basic - hra },
  ];
}

const money = (v: string) => {
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  if (!n) return v;
  const words = amountInWords(n).replace(/\s*Rupees\s+Only$/i, "").replace(/\s*Only$/i, "");
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })} (Rupees ${words} only)`;
};

export function longDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// All values a letter's wording can use, already written out for printing.
export function letterValues(l: Pick<Letter, "type" | "person" | "fields" | "date" | "salary">, company: string): Record<string, string> {
  const t = templateFor(l.type);
  const v: Record<string, string> = {};
  for (const fl of t.fields) {
    const raw = String(l.fields[fl.key] ?? "").trim();
    v[fl.key] = !raw ? "" : fl.kind === "date" ? longDate(raw) : fl.kind === "money" ? money(raw) : raw;
  }
  // Fields that aren't part of this type but were filled earlier still work in custom wording.
  for (const [k, raw] of Object.entries(l.fields)) if (!(k in v)) v[k] = String(raw ?? "").trim();
  const name = l.person.name.trim();
  v.name = name;
  v.firstName = name.split(/\s+/)[0] || name;
  v.salutation = l.person.salutation;
  v.fullName = [l.person.salutation, name].filter(Boolean).join(" ");
  v.employeeId = l.person.employeeId.trim();
  v.email = l.person.email.trim();
  v.phone = l.person.phone.trim();
  v.company = company;
  v.date = longDate(l.date);
  v.hasSalary = l.salary.some((r) => r.label.trim() && r.monthly > 0) ? "yes" : "";
  return v;
}

// Fills {{field}}, {{#field}}…{{/field}} and {{^field}}…{{/field}}. Unknown or empty fields print as "______".
export function fillWording(text: string, values: Record<string, string>) {
  let out = String(text ?? "");
  // Inner blocks first, so blocks can sit inside blocks.
  for (let i = 0; i < 6; i++) {
    const next = out.replace(/\{\{([#^])\s*(\w+)\s*\}\}((?:(?!\{\{[#^]\s*\w+\s*\}\})[\s\S])*?)\{\{\/\s*\2\s*\}\}/g, (_, sign: string, key: string, inner: string) => {
      const filled = !!String(values[key] ?? "").trim();
      return (sign === "#") === filled ? inner : "";
    });
    if (next === out) break;
    out = next;
  }
  return out.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => (String(values[key] ?? "").trim() ? values[key] : "______"));
}

export type Block = { kind: "p" | "h" | "ul"; lines: string[] };

// Splits filled wording into headings, paragraphs and bullet lists.
export function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((x) => x.trimEnd()).filter((x) => x.trim());
    let para: string[] = [];
    let list: string[] = [];
    const flush = () => {
      if (para.length) blocks.push({ kind: "p", lines: para });
      if (list.length) blocks.push({ kind: "ul", lines: list });
      para = [];
      list = [];
    };
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("## ")) {
        flush();
        blocks.push({ kind: "h", lines: [t.slice(3)] });
      } else if (/^[-•]\s+/.test(t)) {
        if (para.length) { blocks.push({ kind: "p", lines: para }); para = []; }
        list.push(t.replace(/^[-•]\s+/, ""));
      } else {
        if (list.length) { blocks.push({ kind: "ul", lines: list }); list = []; }
        para.push(t);
      }
    }
    flush();
  }
  return blocks;
}

export const salaryTotal = (rows: SalaryRow[]) => rows.reduce((s, r) => s + (Number(r.monthly) || 0), 0);

export const isLetterCode = (v: string) => /^SPX-L-[A-Z0-9]{6}$/.test(v);

// Link printed in the letter's QR code: the public verify page with the code filled in.
export function verifyLink(base: string, code: string) {
  const b = String(base || "").trim().replace(/\/+$/, "");
  return `${/^https?:\/\//.test(b) ? b : `https://${b}`}?id=${encodeURIComponent(code)}`;
}
export const verifyLabel = (base: string) => String(base || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
