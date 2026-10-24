// "Which letter to issue, and when": the guide shown at /letter-guide (Admin → HR letters → Guide).
// Keys match LETTER_TEMPLATES.

export type GuideEntry = {
  type: string;
  when: string;
  who: string;
  timing: string;
  need: string[];
  tip: string;
};

export const GUIDE_STAGES: { title: string; note: string; types: string[] }[] = [
  { title: "1. Hiring", note: "From selecting a candidate to their first day.", types: ["job_offer", "appointment"] },
  { title: "2. Internships", note: "From an intern's selection to the end of the internship.", types: ["internship_offer", "internship_completion"] },
  { title: "3. During employment", note: "Changes and concerns while the employee is with the company.", types: ["confirmation", "increment", "promotion", "warning"] },
  { title: "4. On the employee's request", note: "Proof for banks, embassies, landlords or universities.", types: ["salary_certificate", "employment_verification", "noc", "recommendation"] },
  { title: "5. Exit", note: "Resignation, end of contract or termination.", types: ["relieving", "experience", "termination"] },
];

export const GUIDE: Record<string, GuideEntry> = {
  job_offer: {
    type: "job_offer",
    when: "After the candidate clears the interview and the salary is agreed, before joining.",
    who: "A newly selected full-time candidate.",
    timing: "7 to 15 days before joining. Allow 3 to 5 days to accept.",
    need: ["Designation and department", "Date of joining", "Annual CTC with salary break-up", "Location, reporting manager, probation and notice period"],
    tip: "Treat the joining as confirmed only after you receive the signed copy.",
  },
  appointment: {
    type: "appointment",
    when: "On joining. It sets out the full terms of employment.",
    who: "Every new employee who has accepted the offer.",
    timing: "On the date of joining.",
    need: ["All details from the offer letter", "Employee ID, if assigned", "Working hours and reporting manager"],
    tip: "Keep a copy signed by the employee in their file. Use \"Another letter\" in the offer letter to carry its details over.",
  },
  internship_offer: {
    type: "internship_offer",
    when: "After an intern is selected, before the internship starts.",
    who: "A selected intern (paid or unpaid).",
    timing: "3 to 7 days before the start date.",
    need: ["Internship role", "Start and end dates", "Monthly stipend (leave empty if unpaid)", "Work mode and timings"],
    tip: "Create it from the letter button next to the intern in the Interns list, so the name and dates are filled in for you.",
  },
  internship_completion: {
    type: "internship_completion",
    when: "When the internship is completed satisfactorily.",
    who: "An intern who has completed the internship.",
    timing: "On the last day or within 7 days.",
    need: ["Role and dates", "Projects worked on (optional)", "Mentor's name (optional)"],
    tip: "Issued in certificate form. The internship certificate from the Certificates section can be given along with it.",
  },
  confirmation: {
    type: "confirmation",
    when: "When the probation period (usually 3 to 6 months) is completed successfully.",
    who: "An employee on probation.",
    timing: "On the day probation ends.",
    need: ["Designation", "Date of joining", "Date of confirmation"],
    tip: "If performance is not satisfactory, discuss an extension of probation with the employee instead of confirming.",
  },
  increment: {
    type: "increment",
    when: "When the salary is revised, usually once a year after the appraisal.",
    who: "The employee whose salary is revised.",
    timing: "Before or in the month the new salary takes effect.",
    need: ["Current and new annual CTC", "Effective date", "Revised salary break-up (optional)"],
    tip: "Update payroll and bank transfers from the same effective date.",
  },
  promotion: {
    type: "promotion",
    when: "When an employee moves to a higher role or new designation.",
    who: "The employee being promoted.",
    timing: "On the effective date of the promotion.",
    need: ["Current and new designation", "Effective date", "New CTC, if it changes"],
    tip: "If the salary also changes, mention the new CTC here. A separate increment letter is not needed.",
  },
  warning: {
    type: "warning",
    when: "For misconduct, unapproved absence or repeated negligence that continues after a verbal discussion.",
    who: "The employee concerned.",
    timing: "Within 2 to 7 days of the incident.",
    need: ["What happened, with dates", "What is expected from now on", "Last date to reply"],
    tip: "State facts only, in a neutral tone. Keep a copy on file: it is an important record before any termination.",
  },
  salary_certificate: {
    type: "salary_certificate",
    when: "When an employee needs proof of salary for a loan, credit card, visa or rental.",
    who: "A current employee who requests it.",
    timing: "Within 1 to 2 working days of the request.",
    need: ["Designation and date of joining", "Annual CTC and monthly gross salary", "Purpose"],
    tip: "Banks usually ask for the letterhead format, so this is issued as a letter by default. The figures must match the payslips.",
  },
  employment_verification: {
    type: "employment_verification",
    when: "When an employee needs proof of current employment (rental agreement, background check, university).",
    who: "A current employee.",
    timing: "Within 1 to 2 working days of the request.",
    need: ["Designation, department and date of joining", "Employment type (full-time, part-time or contract)", "Purpose"],
    tip: "This letter does not mention salary. If salary proof is needed, issue a salary certificate.",
  },
  noc: {
    type: "noc",
    when: "When an employee needs the company's consent for a passport, visa, higher studies or other activity.",
    who: "A current employee.",
    timing: "Within 1 to 3 working days of the request.",
    need: ["Designation and date of joining", "What the company has no objection to (e.g. \"applying for a passport\")"],
    tip: "State the purpose precisely. Issued in certificate form by default; letter form is also available.",
  },
  recommendation: {
    type: "recommendation",
    when: "When a current or former employee or intern requests a recommendation for studies or a new role.",
    who: "An employee or intern with a good track record.",
    timing: "On request, before the applicant's deadline.",
    need: ["Role and dates", "Specific achievements (2 to 3 lines)", "What the person is recommended for"],
    tip: "It should be signed by the manager who worked with the person. Keep the praise specific and honest.",
  },
  relieving: {
    type: "relieving",
    when: "After the resignation is accepted, on the last working day.",
    who: "An employee leaving after resignation.",
    timing: "On the last working day, after the handover and return of company property.",
    need: ["Resignation date", "Date of joining and last working day", "Designation"],
    tip: "The next employer will ask for this letter. Issue the experience certificate together with it.",
  },
  experience: {
    type: "experience",
    when: "At the end of employment (resignation or completion of contract).",
    who: "An employee leaving the company.",
    timing: "On the last working day, with the relieving letter.",
    need: ["Designation and department", "Date of joining and last working day", "Key responsibilities (optional)"],
    tip: "Issued in certificate form. An experience certificate is not required in cases of termination.",
  },
  termination: {
    type: "termination",
    when: "When the company ends employment for serious misconduct or continued issues after a warning.",
    who: "The employee concerned.",
    timing: "Only after a warning letter and a discussion with the employee.",
    need: ["Last working day", "Clear reason"],
    tip: "Consult a lawyer or HR professional before issuing. Give notice, or pay in lieu of notice, as per the appointment letter.",
  },
};

export const GUIDE_SITUATIONS: { need: string; give: string }[] = [
  { need: "A candidate has been selected", give: "Job offer letter, then the appointment letter on joining" },
  { need: "A new intern is joining", give: "Internship offer letter" },
  { need: "An internship has ended", give: "Internship completion certificate" },
  { need: "Probation is complete", give: "Confirmation letter" },
  { need: "Salary has been revised", give: "Salary increment letter" },
  { need: "Employee moves to a higher role", give: "Promotion letter" },
  { need: "Salary proof for a loan or credit card", give: "Salary certificate" },
  { need: "Proof of employment for a rental or background check", give: "Employment verification letter" },
  { need: "Company consent for a passport, visa or studies", give: "No objection certificate (NOC)" },
  { need: "Reference for further studies or a new job", give: "Letter of recommendation" },
  { need: "Misconduct or unapproved absence", give: "Warning letter" },
  { need: "Employee resigned and is leaving", give: "Relieving letter and experience certificate" },
  { need: "Company is ending the employment", give: "Termination letter (after a warning and advice)" },
];

export const GUIDE_STEPS = [
  "Go to Admin → HR letters → New letter and choose the type. For an intern, use the letter button next to their name in the Interns list.",
  "Fill in the person's name, email and the details. The live preview on the right shows the final letter.",
  "Under Signatures, choose who signs (up to three in one row).",
  "When everything is correct, press Issue letter. This adds the verification code and QR code.",
  "Download the PDF, or send it with Email to person or WhatsApp.",
  "If a letter was issued by mistake, open it and press Revoke. The verify page will show it as no longer valid. Then create a corrected letter.",
];

export const GUIDE_REMINDERS = [
  "Keep a copy of every letter, and the signed copy where applicable, in the employee's file. Every letter is also saved in the system.",
  "Salary, dates and designation must match payroll and the appointment letter.",
  "Revoke a wrong letter instead of deleting it, so the verify page clearly shows it is no longer valid.",
  "Take advice from a lawyer or HR professional before issuing a warning or termination letter.",
  "Anyone can check that a letter is genuine on the website's verify page, using its code or the QR code.",
];
