import type { Intern } from "./interns";
import { emailPerson } from "./notify";
import { SITE_URL } from "./site";

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

// Messages sent when an intern or job applicant is selected, not selected, or gets a certificate.
export async function mailStatus(i: Intern, contact: { email: string; phone: string }) {
  const job = i.kind === "job";
  const what = job ? `the ${i.role || "open"} role` : `the ${i.role || ""} internship`.replace(/\s+/g, " ");
  if (i.status === "selected") {
    return emailPerson(
      i.email,
      job ? `You're shortlisted for ${i.role} at Spinex IT Solutions` : `You're selected for the ${i.role} internship at Spinex IT Solutions`,
      `Congratulations, ${first(i.name)}!`,
      [
        job
          ? `Thank you for applying for ${what}. We liked your profile and you're shortlisted for the next step.`
          : `Thank you for applying for ${what}. We're happy to tell you that you've been selected.`,
        "Our team will call or email you shortly with the next steps, dates and details.",
        `If you have any questions, reply to this email or call us on +91 ${contact.phone}.`,
      ],
    );
  }
  if (i.status === "rejected") {
    return emailPerson(
      i.email,
      `Update on your application for ${i.role || "Spinex IT Solutions"}`,
      `Hi ${first(i.name)},`,
      [
        `Thank you for your interest in ${what} at Spinex IT Solutions and for the time you put into your application.`,
        "After careful review, we won't be moving forward with your application this time.",
        "We'll keep your details on file and may reach out when a suitable opening comes up. We wish you all the best.",
      ],
    );
  }
  return false;
}

export async function mailCertificate(i: Intern) {
  const url = `${SITE_URL}/verify?id=${encodeURIComponent(i.certId)}`;
  return emailPerson(
    i.email,
    `Your internship certificate from Spinex IT Solutions (${i.certId})`,
    `Well done, ${first(i.name)}!`,
    [
      `You've completed your ${i.role ? `${i.role} ` : ""}internship with Spinex IT Solutions, and your certificate has been issued.`,
      `Certificate number: ${i.certId}`,
      "Anyone, including future employers, can check it on our website using this number. We'll share a PDF copy of the certificate with you separately.",
      "Thank you for your work with us, and best of luck for what's next.",
    ],
    { label: "Verify your certificate", url },
  );
}
