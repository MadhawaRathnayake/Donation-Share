import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_dummy';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'dummy_token';
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

// Initialize client only if we have real credentials, to avoid crashing if empty
let client: twilio.Twilio | null = null;
if (accountSid !== 'AC_dummy') {
  try {
    client = twilio(accountSid, authToken);
  } catch (error) {
    console.error('Twilio initialization error:', error);
  }
}

export const sendSMS = async (to: string, body: string) => {
  try {
    if (client) {
      const message = await client.messages.create({
        body,
        from: twilioNumber,
        to,
      });
      console.log(`SMS sent to ${to}: ${message.sid}`);
    } else {
      console.log(`[MOCK SMS] To: ${to} | Body: ${body}`);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};
