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
  certificate?: boolean; // printed as a landscape certificate by default (can be switched to letter form)
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

We are pleased to offer you an internship at **{{company}}** as **{{role}}**{{#department}} in the {{department}} team{{/department}}.

## Internship details
- Duration: {{startDate}} to {{endDate}}
- Work mode: {{workMode}}{{#location}}, {{location}}{{/location}}
- Timings: {{workHours}}
{{#reportingTo}}- Reporting to: {{reportingTo}}
{{/reportingTo}}- Stipend: {{#stipend}}{{stipend}} per month{{/stipend}}{{^stipend}}Unpaid{{/stipend}}

## Terms
- You will keep all company and client information confidential.
- Work created during the internship belongs to {{company}}.
- Either side may end the internship with 7 days' written notice.
- A certificate will be issued on successful completion.

Please confirm your acceptance{{#acceptBy}} by {{acceptBy}}{{/acceptBy}} by signing and returning a copy of this letter. We look forward to having you on the team.`,
  },

  job_offer: {
    code: "OL", label: "Job offer letter", group: "Hiring", help: "Offer a job with CTC, joining date and salary break-up.", acceptance: true, salary: true,
    fields: [f.designation, f.department, f.joiningDate, f.ctc, f.location, f.workMode, f.reportingTo, f.probation, f.noticePeriod, f.acceptBy],
    subject: "Offer of employment",
    body: `Dear {{firstName}},

Following your interview, we are pleased to offer you the position of **{{designation}}**{{#department}} ({{department}}){{/department}} at **{{company}}**.

## Offer details
- Date of joining: {{joiningDate}}
- Annual CTC: {{ctc}}
- Location: {{location}}{{#workMode}} · {{workMode}}{{/workMode}}
{{#reportingTo}}- Reporting to: {{reportingTo}}
{{/reportingTo}}- Probation: {{probation}} months · Notice period: {{noticePeriod}}

{{#hasSalary}}The salary break-up is given below. {{/hasSalary}}This offer is subject to verification of your documents. Please bring your original certificates, ID proof and PAN card on the day of joining.

Please confirm your acceptance{{#acceptBy}} by {{acceptBy}}{{/acceptBy}} by signing and returning a copy of this letter. We look forward to welcoming you.`,
  },

  appointment: {
    code: "AL", label: "Appointment letter", group: "Hiring", help: "Full terms of employment, given on joining.", acceptance: true, salary: true,
    fields: [f.designation, f.department, f.joiningDate, f.ctc, f.location, f.workHours, f.reportingTo, f.probation, f.noticePeriod],
    subject: "Letter of appointment",
    body: `Dear {{firstName}},

We are pleased to appoint you as **{{designation}}**{{#department}} ({{department}}){{/department}} at **{{company}}** with effect from {{joiningDate}}, on the following terms:

- **Compensation:** Annual CTC of {{ctc}}{{#hasSalary}} as per the break-up below{{/hasSalary}}, paid monthly after applicable deductions.
- **Probation:** {{probation}} months, after which your confirmation will be given in writing.
- **Location and hours:** {{location}}; {{workHours}}.
{{#reportingTo}}- **Reporting to:** {{reportingTo}}.
{{/reportingTo}}- **Notice period:** 15 days during probation and {{noticePeriod}} after confirmation.
- **Confidentiality and IP:** Company and client information must be kept confidential. All work created during employment belongs to {{company}}.
- **Conduct:** You will follow company policies, including the leave policy, and will not take up other paid work without written approval.

Please sign and return a copy of this letter to confirm your acceptance. Welcome to {{company}}.`,
  },

  confirmation: {
    code: "CF", label: "Confirmation letter", group: "During employment", help: "Confirms the job after probation.",
    fields: [f.designation, f.joiningDate, { key: "confirmationDate", label: "Confirmed from", kind: "date" }],
    subject: "Confirmation of employment",
    body: `Dear {{firstName}},

We are pleased to confirm your employment as **{{designation}}** with effect from {{confirmationDate}}, on successful completion of your probation. All other terms of your appointment remain unchanged.

Thank you for your contribution. We look forward to your continued growth with {{company}}.`,
  },

  increment: {
    code: "IN", label: "Salary increment letter", group: "During employment", help: "New CTC from a date, with optional break-up.", salary: true,
    fields: [f.designation, { key: "effectiveDate", label: "Effective from", kind: "date" }, { key: "oldCtc", label: "Current annual CTC (₹)", kind: "money" }, { key: "newCtc", label: "New annual CTC (₹)", kind: "money" }],
    subject: "Revision of salary",
    body: `Dear {{firstName}},

In recognition of your performance, your annual CTC is revised{{#oldCtc}} from {{oldCtc}}{{/oldCtc}} to **{{newCtc}}** with effect from {{effectiveDate}}.{{#hasSalary}} The revised break-up is given below.{{/hasSalary}}

All other terms of your employment remain unchanged. Thank you for your continued contribution to {{company}}.`,
  },

  promotion: {
    code: "PR", label: "Promotion letter", group: "During employment", help: "New designation, with optional new CTC.",
    fields: [{ key: "oldDesignation", label: "Current designation", kind: "text" }, { key: "newDesignation", label: "New designation", kind: "text" }, { key: "effectiveDate", label: "Effective from", kind: "date" }, { key: "newCtc", label: "New annual CTC (₹, optional)", kind: "money" }, f.reportingTo],
    subject: "Promotion",
    body: `Dear {{firstName}},

Congratulations! You are promoted from {{oldDesignation}} to **{{newDesignation}}** with effect from {{effectiveDate}}.{{#newCtc}} Your revised annual CTC will be {{newCtc}}.{{/newCtc}}{{#reportingTo}} You will report to {{reportingTo}}.{{/reportingTo}}

This recognises your hard work and contribution. We wish you continued success in your new role.`,
  },

  experience: {
    code: "EX", label: "Experience certificate", group: "Leaving", help: "Certifies the period and role of someone who worked here.", toWhom: true, certificate: true,
    fields: [f.designation, f.department, f.joiningDate, f.lastDate, { key: "summary", label: "Work done (optional)", kind: "textarea", wide: true, placeholder: "e.g. built and maintained client websites using React and Next.js" }],
    subject: "Experience certificate",
    body: `This is to certify that **{{fullName}}**{{#employeeId}} (Employee ID: {{employeeId}}){{/employeeId}} was employed with **{{company}}** as **{{designation}}**{{#department}} in the {{department}} team{{/department}} from {{joiningDate}} to {{lastDate}}.

{{#summary}}{{firstName}}'s responsibilities included {{summary}}. {{/summary}}During this period, we found {{firstName}} sincere, skilled and professional.

We wish {{firstName}} success in all future endeavours.`,
  },

  relieving: {
    code: "RL", label: "Relieving letter", group: "Leaving", help: "Confirms the resignation was accepted and the person is relieved.",
    fields: [f.designation, f.joiningDate, { key: "resignationDate", label: "Resignation date", kind: "date" }, f.lastDate],
    subject: "Relieving letter",
    body: `Dear {{firstName}},

With reference to your resignation dated {{resignationDate}}, we confirm that you are relieved from your duties as **{{designation}}** at **{{company}}** with effect from the close of business on {{lastDate}}.

Your tenure with us was from {{joiningDate}} to {{lastDate}}. Your full and final settlement will be processed as per company policy, and the confidentiality terms of your appointment continue to apply.

We thank you for your contribution and wish you success ahead.`,
  },

  internship_completion: {
    code: "IC", label: "Internship completion certificate", group: "Internship", help: "Certifies that an internship was completed.", toWhom: true, certificate: true,
    fields: [f.role, f.startDate, f.endDate, { key: "project", label: "Work / projects (optional)", kind: "textarea", wide: true, placeholder: "e.g. a restaurant ordering website and the company's blog" }, { key: "mentor", label: "Mentor (optional)", kind: "text" }],
    subject: "Internship completion certificate",
    body: `This is to certify that **{{fullName}}** has successfully completed an internship at **{{company}}** as **{{role}}** from {{startDate}} to {{endDate}}.

{{#project}}During the internship, {{firstName}} worked on {{project}}. {{/project}}{{#mentor}}The internship was completed under the guidance of {{mentor}}. {{/mentor}}{{firstName}} showed dedication, discipline and a strong willingness to learn.

We wish {{firstName}} all the best for the future.`,
  },

  salary_certificate: {
    code: "SC", label: "Salary certificate", group: "Certificates", help: "Salary proof for loans, visas or rent.", toWhom: true, salary: true,
    fields: [f.designation, f.joiningDate, f.ctc, { key: "monthlyGross", label: "Monthly gross salary (₹)", kind: "money" }, f.purpose],
    subject: "Salary certificate",
    body: `This is to certify that **{{fullName}}**{{#employeeId}} (Employee ID: {{employeeId}}){{/employeeId}} is employed with **{{company}}** as **{{designation}}** since {{joiningDate}}, with an annual CTC of {{ctc}}{{#monthlyGross}} and a monthly gross salary of {{monthlyGross}}{{/monthlyGross}}.{{#hasSalary}} The break-up is given below.{{/hasSalary}}

This certificate is issued at the employee's request{{#purpose}} for {{purpose}}{{/purpose}}.`,
  },

  employment_verification: {
    code: "EV", label: "Employment verification letter", group: "Certificates", help: "Confirms someone currently works here.", toWhom: true,
    fields: [f.designation, f.department, f.joiningDate, { key: "employmentType", label: "Type", kind: "select", options: ["full-time", "part-time", "contract"], initial: "full-time" }, f.purpose],
    subject: "Employment verification",
    body: `This is to certify that **{{fullName}}**{{#employeeId}} (Employee ID: {{employeeId}}){{/employeeId}} has been working with **{{company}}** as **{{designation}}**{{#department}} in the {{department}} team{{/department}} on a {{employmentType}} basis since {{joiningDate}}.

This letter is issued at the employee's request{{#purpose}} for {{purpose}}{{/purpose}} and carries no financial liability for the company.`,
  },

  recommendation: {
    code: "LR", label: "Letter of recommendation", group: "Certificates", help: "Recommends a past employee or intern.", toWhom: true,
    fields: [{ key: "role", label: "Role here", kind: "text" }, f.startDate, f.endDate, { key: "strengths", label: "What they did well", kind: "textarea", wide: true, placeholder: "e.g. Priya built our client dashboard on her own and trained two new interns." }, { key: "recommendFor", label: "Recommended for (optional)", kind: "text", placeholder: "e.g. a master's programme in computer science" }],
    subject: "Letter of recommendation",
    body: `I am pleased to recommend **{{fullName}}**, who worked with **{{company}}** as **{{role}}** from {{startDate}} to {{endDate}}.

{{#strengths}}{{strengths}}

{{/strengths}}{{firstName}} is reliable, learns quickly and works well in a team. I recommend {{firstName}} without reservation{{#recommendFor}} for {{recommendFor}}{{/recommendFor}} and am happy to share more information if needed.`,
  },

  noc: {
    code: "NC", label: "No objection certificate (NOC)", group: "Certificates", help: "For passport, visa, studies or other work.", toWhom: true, certificate: true,
    fields: [f.designation, f.joiningDate, { key: "purpose", label: "No objection to …", kind: "text", hint: "Finishes the sentence: “The company has no objection to Priya …”", placeholder: "applying for a passport" }],
    subject: "No objection certificate",
    body: `This is to certify that **{{fullName}}**{{#employeeId}} (Employee ID: {{employeeId}}){{/employeeId}} is working with **{{company}}** as **{{designation}}** since {{joiningDate}}.

The company has no objection to {{firstName}} {{purpose}}. This certificate is issued at the employee's request.`,
  },

  warning: {
    code: "WL", label: "Warning letter", group: "During employment", help: "Formal warning about conduct or performance.",
    fields: [f.designation, { key: "incidentDate", label: "Date of the issue (optional)", kind: "date" }, { key: "issue", label: "What happened", kind: "textarea", wide: true, placeholder: "e.g. You were absent without informing anyone on 3 days in October." }, { key: "expectation", label: "What we expect now", kind: "textarea", wide: true, placeholder: "e.g. inform your manager before taking leave" }, { key: "replyBy", label: "Reply by (optional)", kind: "date" }],
    subject: "Warning letter",
    body: `Dear {{firstName}},

This letter concerns the following issue{{#incidentDate}} observed on {{incidentDate}}{{/incidentDate}}:

{{issue}}

This is not in line with company policy.{{#expectation}} We expect you to {{expectation}}.{{/expectation}} Please treat this as a formal warning. A repeat may lead to further disciplinary action, up to and including termination.{{#replyBy}} You may submit a written explanation by {{replyBy}}.{{/replyBy}}`,
  },

  termination: {
    code: "TM", label: "Termination letter", group: "Leaving", help: "Ends employment from a date, with the reason.",
    fields: [f.designation, f.lastDate, { key: "reason", label: "Reason", kind: "textarea", wide: true }],
    subject: "Termination of employment",
    body: `Dear {{firstName}},

We regret to inform you that your employment as **{{designation}}** with **{{company}}** stands terminated with effect from {{lastDate}}.{{#reason}} Reason: {{reason}}{{/reason}}

Your full and final settlement will be processed as per company policy. Please return all company property, including ID card, laptop and account access, by {{lastDate}}. The confidentiality terms of your appointment continue to apply.`,
  },
};

export const LETTER_TYPES = Object.keys(LETTER_TEMPLATES);
export const LETTER_GROUPS: LetterGroup[] = ["Hiring", "Internship", "During employment", "Leaving", "Certificates"];

export type LetterLayout = "letter" | "certificate";
export const defaultLayout = (type: string): LetterLayout => (templateFor(type).certificate ? "certificate" : "letter");
// Certificate form is only offered for "to whom it may concern" types.
export const showsAsCertificate = (l: { type: string; layout?: LetterLayout }) => !!templateFor(l.type).toWhom && (l.layout ?? defaultLayout(l.type)) === "certificate";

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
  layout: LetterLayout; // "certificate" prints a landscape certificate (only for "to whom it may concern" types)
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
