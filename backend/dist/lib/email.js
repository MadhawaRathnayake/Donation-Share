"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'test@gmail.com',
        pass: process.env.EMAIL_PASS || 'password',
    },
});
const sendEmail = async (to, subject, text) => {
    try {
        const info = await transporter.sendMail({
            from: `"FoodShare" <${process.env.EMAIL_USER || 'test@gmail.com'}>`,
            to,
            subject,
            text,
        });
        console.log(`Email sent to ${to}: ${info.messageId}`);
    }
    catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};
exports.sendEmail = sendEmail;
