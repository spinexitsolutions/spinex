// Made-up people and details for the sample of every letter type (Admin → HR letters → Samples).
// Nothing here is real. Used to check that every letter looks right and fits on one page.
import { LETTER_TEMPLATES, blankPerson, initialFields, salaryFromCtc, type Letter, type Letterhead } from "./letters";

// Hand-drawn-looking signature lines as small SVG images.
const sig = (path: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><path d="${path}" fill="none" stroke="#1f2a6b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}`;

export const SAMPLE_HEAD: Letterhead = {
  legalName: "Spinex IT Solutions",
  address: "2nd Floor, Shree Tower, Tonk Road\nDurgapura, Jaipur, Rajasthan 302018",
  phone: "+91 98765 43210",
  email: "hr@spinexitsolutions.com",
  website: "spinexitsolutions.com",
  gstin: "08ABCDE1234F1Z5",
  signers: [
    { id: "s1", name: "Rohit Sharma", title: "Founder & Director", show: true, image: sig("M10 42 C 25 10, 40 10, 38 40 S 60 50, 70 30 S 90 12, 95 38 C 100 50, 120 20, 135 34 S 165 44, 190 22") },
    { id: "s2", name: "Neha Verma", title: "HR Manager", show: true, image: sig("M12 40 C 20 15, 35 15, 30 42 C 45 20, 60 18, 62 40 C 75 25, 85 25, 90 40 S 120 30, 140 36 S 175 28, 188 30") },
    { id: "s3", name: "Amit Jain", title: "Project Manager", show: true, image: sig("M14 36 C 30 8, 44 50, 56 26 S 78 10, 84 34 C 92 48, 110 18, 126 32 S 150 46, 186 20") },
  ],
};

type Sample = { type: string; person: Partial<Letter["person"]>; fields: Record<string, string>; salary?: boolean };

const SAMPLES: Sample[] = [
  { type: "job_offer", person: { salutation: "Ms.", name: "Priya Mehta", email: "priya.mehta@example.com", address: "B-14, Malviya Nagar\nJaipur 302017" }, fields: { designation: "Junior Web Developer", department: "Development", joiningDate: "2026-11-02", ctc: "360000", location: "Jaipur, Rajasthan", reportingTo: "Amit Jain, Project Manager", acceptBy: "2026-10-30" }, salary: true },
  { type: "appointment", person: { salutation: "Ms.", name: "Priya Mehta", address: "B-14, Malviya Nagar\nJaipur 302017", employeeId: "SPX-E-024" }, fields: { designation: "Junior Web Developer", department: "Development", joiningDate: "2026-11-02", ctc: "360000", location: "Jaipur office", reportingTo: "Amit Jain, Project Manager" }, salary: true },
  { type: "internship_offer", person: { salutation: "Mr.", name: "Karan Singh Rathore", address: "Hostel 3, JECRC University\nJaipur 303905" }, fields: { role: "UI/UX Design Intern", department: "Design", startDate: "2026-11-10", endDate: "2027-02-09", stipend: "8000", workMode: "Hybrid", location: "Jaipur", reportingTo: "Neha Verma", acceptBy: "2026-11-03" } },
  { type: "internship_completion", person: { salutation: "Mr.", name: "Karan Singh Rathore" }, fields: { role: "UI/UX Design Intern", startDate: "2026-06-01", endDate: "2026-08-31", project: "the mobile app screens for a restaurant ordering platform and the redesign of a client's e-commerce checkout", mentor: "Neha Verma" } },
  { type: "confirmation", person: { salutation: "Mr.", name: "Rahul Gupta", address: "Vaishali Nagar, Jaipur" }, fields: { designation: "Digital Marketing Executive", joiningDate: "2026-04-01", confirmationDate: "2026-10-01" } },
  { type: "increment", person: { salutation: "Ms.", name: "Sneha Agarwal", employeeId: "SPX-E-011" }, fields: { designation: "Senior React Developer", effectiveDate: "2026-11-01", oldCtc: "540000", newCtc: "660000" }, salary: true },
  { type: "promotion", person: { salutation: "Mr.", name: "Vikas Choudhary", employeeId: "SPX-E-007" }, fields: { oldDesignation: "Web Developer", newDesignation: "Team Lead, Web Development", effectiveDate: "2026-11-01", newCtc: "720000", reportingTo: "Rohit Sharma, Director" } },
  { type: "warning", person: { salutation: "Mr.", name: "Ankit Yadav", employeeId: "SPX-E-019" }, fields: { designation: "Support Executive", incidentDate: "2026-10-14", issue: "You were absent from work on 14, 15 and 16 October 2026 without informing your manager, which delayed two client tickets.", expectation: "inform your reporting manager in advance before taking any leave", replyBy: "2026-10-28" } },
  { type: "experience", person: { salutation: "Ms.", name: "Pooja Sharma", employeeId: "SPX-E-005" }, fields: { designation: "Graphic Designer", department: "Design", joiningDate: "2024-07-15", lastDate: "2026-09-30", summary: "social media creatives, brand identities and website designs for over 40 clients" } },
  { type: "relieving", person: { salutation: "Ms.", name: "Pooja Sharma", address: "Mansarovar, Jaipur", employeeId: "SPX-E-005" }, fields: { designation: "Graphic Designer", joiningDate: "2024-07-15", resignationDate: "2026-08-31", lastDate: "2026-09-30" } },
  { type: "termination", person: { salutation: "Mr.", name: "Deepak Meena", employeeId: "SPX-E-021" }, fields: { designation: "Sales Executive", lastDate: "2026-10-31", reason: "continued absence without notice despite a written warning dated 2 October 2026." } },
  { type: "salary_certificate", person: { salutation: "Mr.", name: "Rahul Gupta", employeeId: "SPX-E-016" }, fields: { designation: "Digital Marketing Executive", joiningDate: "2026-04-01", ctc: "420000", monthlyGross: "35000", purpose: "a home loan application with HDFC Bank" }, salary: true },
  { type: "employment_verification", person: { salutation: "Ms.", name: "Sneha Agarwal", employeeId: "SPX-E-011" }, fields: { designation: "Senior React Developer", department: "Development", joiningDate: "2023-01-09", employmentType: "full-time", purpose: "a rental agreement" } },
  { type: "recommendation", person: { salutation: "Mr.", name: "Karan Singh Rathore" }, fields: { role: "UI/UX Design Intern", startDate: "2026-06-01", endDate: "2026-08-31", strengths: "Karan designed the complete app flow for a client's food delivery platform and presented it to the client on his own. He takes feedback well and improves quickly.", recommendFor: "the Master of Design programme" } },
  { type: "noc", person: { salutation: "Mr.", name: "Vikas Choudhary", employeeId: "SPX-E-007" }, fields: { designation: "Team Lead, Web Development", joiningDate: "2022-08-01", purpose: "applying for a passport" } },
];

export function sampleLetters(): Letter[] {
  return SAMPLES.map((s, i) => {
    const t = LETTER_TEMPLATES[s.type];
    const fields = { ...initialFields(s.type), ...s.fields };
    return {
      id: `sample-${i}`,
      type: s.type,
      number: `SPX/${t.code}/2026/0${String(14 + i).padStart(2, "0")}`,
      verifyCode: `SPX-L-${["7KQ2X9", "M4TR8D", "H9WP3K", "Q2ZL6N", "B8XC4V", "T6YJ2R", "P3NF7G", "W5KD9S", "C7RM2H", "L4VB8Q", "X2GT6P", "D9HN3W", "F6SZ4K", "R8JC5M", "N3QX7T"][i]}`,
      status: "issued",
      date: "2026-10-24",
      person: { ...blankPerson(), ...s.person },
      fields,
      subject: t.subject,
      body: t.body,
      salary: s.salary ? salaryFromCtc(Number(fields.newCtc || fields.ctc)) : [],
      signers: null,
      internId: "",
      token: "",
      issuedAt: "2026-10-24T10:00:00.000Z",
      sentAt: "",
      createdBy: "Sample",
      createdAt: "",
      updatedAt: "",
    };
  });
}
