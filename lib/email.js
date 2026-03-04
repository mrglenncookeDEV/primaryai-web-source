const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";
const SURVEY_ALERT_TO = "shout@onepointconsult.com";

export async function sendSurveySubmissionEmail({ responseId, role, completedAt, appUrl }) {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey) {
    return {
      skipped: true,
      reason: "EmailJS not configured (missing EMAILJS_SERVICE_ID / EMAILJS_TEMPLATE_ID / EMAILJS_PUBLIC_KEY)",
    };
  }

  const baseUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || "";
  const responsesUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/survey-responses` : "/survey-responses";

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: SURVEY_ALERT_TO,
      survey_response_id: responseId,
      survey_role: role,
      completed_at: completedAt,
      responses_url: responsesUrl,
      message: `A new PrimaryAI survey has been submitted (${role}).`,
    },
  };

  if (privateKey) {
    payload.accessToken = privateKey;
  }

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`Failed to send EmailJS message: ${response.status} ${err}`);
  }

  return { ok: true, provider: "emailjs", to: SURVEY_ALERT_TO };
}
