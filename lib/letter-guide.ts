// "Kaunsa letter kab dena hai": the guide shown at /letter-guide (Admin → HR letters → Guide).
// Written in simple Hinglish for the team. Keys match LETTER_TEMPLATES.

export type GuideEntry = {
  type: string;
  when: string; // kab dena hai
  who: string; // kisko
  timing: string; // kitne din pehle / baad
  need: string[]; // kya details chahiye
  tip: string; // dhyan rakhein
};

export const GUIDE_STAGES: { title: string; note: string; types: string[] }[] = [
  { title: "1. Hiring (selection ke baad)", note: "Candidate select ho gaya, ab use joining tak le jaana hai.", types: ["job_offer", "appointment"] },
  { title: "2. Internship", note: "Intern ke aane se le kar internship khatam hone tak.", types: ["internship_offer", "internship_completion"] },
  { title: "3. Naukri ke dauraan", note: "Jab employee company mein kaam kar raha hai.", types: ["confirmation", "increment", "promotion", "warning"] },
  { title: "4. Jab koi employee maange (proof ke liye)", note: "Bank, embassy, makaan-malik ya college ke liye.", types: ["salary_certificate", "employment_verification", "noc", "recommendation"] },
  { title: "5. Naukri chhodne par", note: "Resign, contract khatam, ya company ka decision.", types: ["relieving", "experience", "termination"] },
];

export const GUIDE: Record<string, GuideEntry> = {
  job_offer: {
    type: "job_offer",
    when: "Interview clear hone aur salary fix hone ke baad, joining se pehle.",
    who: "Naye selected candidate ko (full-time job).",
    timing: "Joining se 7–15 din pehle. \"Accept by\" mein 3–5 din ka time do.",
    need: ["Designation aur department", "Joining date", "Annual CTC (salary break-up ke saath)", "Location, reporting manager, probation, notice period"],
    tip: "Candidate se signed copy wapas lo. Uske baad hi joining confirm maano.",
  },
  appointment: {
    type: "appointment",
    when: "Joining ke din ya pehle hafte mein. Isme naukri ki saari shartein hoti hain.",
    who: "Har naye employee ko, offer letter accept karne ke baad.",
    timing: "Joining ke din.",
    need: ["Offer letter wali saari details", "Employee ID (agar diya hai)", "Working hours aur reporting manager"],
    tip: "Employee se har page par sign karwa ke ek copy file mein rakho. \"Another letter\" button se offer letter ki details apne aap aa jaati hain.",
  },
  internship_offer: {
    type: "internship_offer",
    when: "Intern select hone ke baad, internship shuru hone se pehle.",
    who: "Selected intern ko (paid ya unpaid dono).",
    timing: "Start date se 3–7 din pehle.",
    need: ["Internship role", "Start aur end date", "Stipend (unpaid ho to khaali chhodo)", "Work mode aur timings"],
    tip: "Interns list mein intern ke aage letter button se banao, naam aur dates apne aap bhar jaate hain.",
  },
  internship_completion: {
    type: "internship_completion",
    when: "Internship poori hone par. Intern ka kaam theek raha ho tabhi do.",
    who: "Internship complete karne wale intern ko.",
    timing: "Last day par ya agle 7 din mein.",
    need: ["Role aur dates", "Kis project par kaam kiya (optional)", "Mentor ka naam (optional)"],
    tip: "Ye certificate form mein banta hai. Aapka purana internship certificate (Certificates section) bhi saath de sakte ho.",
  },
  confirmation: {
    type: "confirmation",
    when: "Probation (aam taur par 3–6 mahine) safalta se poora hone par.",
    who: "Probation par chal rahe employee ko.",
    timing: "Probation khatam hone ke din.",
    need: ["Designation", "Joining date", "Confirmation ki date"],
    tip: "Agar performance theek nahi hai to confirmation mat do, probation badhane ki baat pehle employee se karo.",
  },
  increment: {
    type: "increment",
    when: "Salary badhne par, aam taur par saal mein ek baar (appraisal ke baad).",
    who: "Jis employee ki salary badh rahi hai.",
    timing: "Nayi salary lagu hone se pehle ya usi mahine.",
    need: ["Purani aur nayi annual CTC", "Kab se lagu hai", "Naya salary break-up (optional)"],
    tip: "Nayi CTC payroll aur bank transfer mein bhi usi date se badalna mat bhoolo.",
  },
  promotion: {
    type: "promotion",
    when: "Employee ko upar ka role (nayi designation) milne par.",
    who: "Promote hone wale employee ko.",
    timing: "Promotion lagu hone ke din.",
    need: ["Purani aur nayi designation", "Kab se lagu hai", "Nayi CTC (agar badli hai)"],
    tip: "Salary bhi badh rahi hai to alag se increment letter dene ki zaroorat nahi, promotion letter mein nayi CTC likh do.",
  },
  warning: {
    type: "warning",
    when: "Galat behaviour, bina bataye chhutti, ya kaam mein lagataar laparwahi par, zubaani baat ke baad bhi sudhaar na ho.",
    who: "Sambandhit employee ko.",
    timing: "Ghatna ke 2–7 din ke andar.",
    need: ["Kya hua (saaf aur sach, date ke saath)", "Ab kya expect karte ho", "Jawab dene ki aakhri date"],
    tip: "Sirf facts likho, gussa ya personal baat nahi. Ek copy file mein rakho. Ye termination se pehle zaroori record banta hai.",
  },
  salary_certificate: {
    type: "salary_certificate",
    when: "Jab employee ko loan, credit card, visa ya makaan kiraye ke liye salary proof chahiye.",
    who: "Maangne wale current employee ko.",
    timing: "Maangne ke 1–2 din mein.",
    need: ["Designation aur joining date", "Annual CTC aur monthly gross", "Kis kaam ke liye (purpose)"],
    tip: "Bank aksar letterhead wala format maangta hai, isliye ye default mein letter form mein hai. Salary bilkul wahi likho jo payslip mein hai.",
  },
  employment_verification: {
    type: "employment_verification",
    when: "Jab employee ko proof chahiye ki wo abhi company mein kaam karta hai (rent agreement, verification, college).",
    who: "Current employee ko.",
    timing: "Maangne ke 1–2 din mein.",
    need: ["Designation, department, joining date", "Full-time ya part-time", "Purpose"],
    tip: "Isme salary nahi likhi jaati. Salary bhi chahiye to Salary certificate do.",
  },
  noc: {
    type: "noc",
    when: "Jab employee passport, visa, higher studies ya koi aur kaam karna chahta hai aur company ki manzoori ka letter chahiye.",
    who: "Current employee ko.",
    timing: "Maangne ke 1–3 din mein.",
    need: ["Designation aur joining date", "Kis cheez par aapatti nahi (jaise \"applying for a passport\")"],
    tip: "Purpose saaf likho. Ye certificate form mein banta hai, letter form bhi chun sakte ho.",
  },
  recommendation: {
    type: "recommendation",
    when: "Jab purana ya current employee/intern aage padhai ya naukri ke liye recommendation maange.",
    who: "Achha kaam karne wale employee ya intern ko.",
    timing: "Maangne par, deadline se pehle.",
    need: ["Role aur dates", "Usne kya achha kiya (2–3 line, apne shabdon mein)", "Kis cheez ke liye recommend kar rahe ho"],
    tip: "Signature usi ka rakho jisne uske saath kaam kiya (manager). Jhooti tareef mat likho.",
  },
  relieving: {
    type: "relieving",
    when: "Resign accept hone ke baad, last working day par.",
    who: "Resign karke jaane wale employee ko.",
    timing: "Last day par, handover aur company ka saamaan wapas milne ke baad.",
    need: ["Resignation ki date", "Joining aur last working day", "Designation"],
    tip: "Agli company ye letter maangti hai. Experience certificate bhi saath mein do.",
  },
  experience: {
    type: "experience",
    when: "Naukri khatam hone par (resign ya contract poora).",
    who: "Company chhodne wale employee ko.",
    timing: "Last day par, relieving letter ke saath.",
    need: ["Designation aur department", "Joining aur last day", "Kya kaam kiya (optional)"],
    tip: "Ye certificate form mein banta hai. Termination wale case mein experience certificate dena zaroori nahi.",
  },
  termination: {
    type: "termination",
    when: "Jab company kisi employee ko naukri se hata rahi ho: gambhir galti, ya warning ke baad bhi sudhaar na hona.",
    who: "Sambandhit employee ko.",
    timing: "Pehle warning letter aur baat-cheet ke baad hi.",
    need: ["Last working day", "Saaf karan"],
    tip: "Dene se pehle kisi lawyer ya HR expert se salah lo. Notice period ya uske badle ki salary appointment letter ki shart ke hisaab se do.",
  },
};

export const GUIDE_SITUATIONS: { need: string; give: string }[] = [
  { need: "Naya candidate select hua", give: "Job offer letter, phir joining par Appointment letter" },
  { need: "Naya intern aa raha hai", give: "Internship offer letter" },
  { need: "Internship khatam hui", give: "Internship completion certificate" },
  { need: "Probation poora hua", give: "Confirmation letter" },
  { need: "Salary badhi", give: "Salary increment letter" },
  { need: "Nayi designation mili", give: "Promotion letter" },
  { need: "Bank loan / credit card ke liye salary proof", give: "Salary certificate" },
  { need: "Rent agreement / verification ke liye kaam ka proof", give: "Employment verification letter" },
  { need: "Passport, visa ya padhai ke liye company ki manzoori", give: "NOC" },
  { need: "Aage padhai ya naukri ke liye sifarish", give: "Letter of recommendation" },
  { need: "Galat behaviour ya bina bataye chhutti", give: "Warning letter" },
  { need: "Employee ne resign kiya, last day aaya", give: "Relieving letter + Experience certificate" },
  { need: "Company employee ko hata rahi hai", give: "Termination letter (warning ke baad, salah le kar)" },
];

export const GUIDE_STEPS = [
  "Admin → HR letters → New letter dabao aur type chuno. Intern ho to Interns list mein uske aage letter button se banao.",
  "Naam, email aur details bharo. Daayein taraf live preview dekhte raho.",
  "Signatures mein chuno kaun sign karega (ek line mein teen tak).",
  "Sab sahi ho to \"Issue letter\" dabao. Isse verification code aur QR code lag jaata hai.",
  "PDF download karo, ya \"Email to person\" / WhatsApp se link bhejo.",
  "Galti ho gayi to letter kholo aur \"Revoke\" dabao. Verify page batayega ki ye ab valid nahi hai, phir naya letter banao.",
];
