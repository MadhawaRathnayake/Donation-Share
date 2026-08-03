"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDonations = exports.createDonation = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const rabbitmq_1 = require("../../lib/rabbitmq");
const createDonation = async (req, res) => {
    try {
        const { foodType, quantity, pickupLocation, pickupWindowStart, expiryTime, notes } = req.body;
        const user = req.user; // From auth middleware
        // Get the donor profile
        const donorProfile = await prisma_1.default.donorProfile.findUnique({
            where: { userId: user.id }
        });
        if (!donorProfile) {
            return res.status(400).json({ error: 'Donor profile not found for this user' });
        }
        const donation = await prisma_1.default.foodDonation.create({
            data: {
                foodType,
                quantity,
                pickupLocation,
                pickupWindowStart: new Date(pickupWindowStart),
                expiryTime: new Date(expiryTime),
                notes,
                donorId: donorProfile.id,
                status: 'Posted'
            }
        });
        // Publish Domain Event
        await (0, rabbitmq_1.publishEvent)('notification_queue', {
            eventType: 'DonationPosted',
            donationId: donation.id,
            donorId: donorProfile.id,
            message: `New donation posted: ${foodType}`
        });
        res.status(201).json(donation);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createDonation = createDonation;
const listDonations = async (req, res) => {
    try {
        // Only show active donations that haven't expired
        const donations = await prisma_1.default.foodDonation.findMany({
            where: {
                status: 'Posted',
                expiryTime: { gt: new Date() }
            },
            include: {
                donor: true
            }
        });
        res.json(donations);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.listDonations = listDonations;
