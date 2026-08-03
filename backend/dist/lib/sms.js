"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = void 0;
const twilio_1 = __importDefault(require("twilio"));
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_dummy';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'dummy_token';
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
// Initialize client only if we have real credentials, to avoid crashing if empty
let client = null;
if (accountSid !== 'AC_dummy') {
    try {
        client = (0, twilio_1.default)(accountSid, authToken);
    }
    catch (error) {
        console.error('Twilio initialization error:', error);
    }
}
const sendSMS = async (to, body) => {
    try {
        if (client) {
            const message = await client.messages.create({
                body,
                from: twilioNumber,
                to,
            });
            console.log(`SMS sent to ${to}: ${message.sid}`);
        }
        else {
            console.log(`[MOCK SMS] To: ${to} | Body: ${body}`);
        }
    }
    catch (error) {
        console.error('Error sending SMS:', error);
        throw error;
    }
};
exports.sendSMS = sendSMS;
