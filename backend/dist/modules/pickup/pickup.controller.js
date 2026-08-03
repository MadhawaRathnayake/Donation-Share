"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePickupStatus = exports.acceptPickup = exports.getActivePickup = exports.getAvailablePickups = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const rabbitmq_1 = require("../../lib/rabbitmq");
const getAvailablePickups = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = 10;
        const skip = (page - 1) * pageSize;
        // Available pickups are donations that are Claimed but not yet Assigned
        const [donations, total] = await Promise.all([
            prisma_1.default.foodDonation.findMany({
                where: { status: 'Claimed' },
                skip,
                take: pageSize,
                include: {
                    donor: true,
                    claim: { include: { recipient: true } }
                }
            }),
            prisma_1.default.foodDonation.count({
                where: { status: 'Claimed' }
            })
        ]);
        const items = donations.map((donation) => ({
            id: donation.id, // we use donation.id as pickupId for accepting
            status: 'Claimed',
            donorAddress: donation.donor.address,
            recipientAddress: donation.claim?.recipient.serviceArea || 'Unknown',
            donation: {
                donorName: donation.donor.organizationName,
                foodType: donation.foodType,
                quantity: donation.quantity,
                pickupWindowStart: donation.pickupWindowStart
            }
        }));
        return res.json({ items, page, pageSize, total });
    }
    catch (error) {
        console.error('Error fetching available pickups:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAvailablePickups = getAvailablePickups;
const getActivePickup = async (req, res) => {
    try {
        const keycloakId = req.user.id;
        const volunteer = await prisma_1.default.user.findUnique({ where: { keycloakId } });
        if (!volunteer)
            return res.status(404).json({ error: 'Volunteer not found' });
        const active = await prisma_1.default.pickupAssignment.findFirst({
            where: {
                volunteerId: volunteer.id,
                deliveryStatus: { not: 'Delivered' }
            },
            include: {
                donation: {
                    include: { donor: true, claim: { include: { recipient: true } } }
                }
            }
        });
        if (!active)
            return res.json(null);
        return res.json({
            id: active.id,
            status: active.deliveryStatus,
            donorAddress: active.donation.donor.address,
            recipientAddress: active.donation.claim?.recipient.serviceArea || 'Unknown',
            donation: {
                donorName: active.donation.donor.organizationName,
                foodType: active.donation.foodType,
                quantity: active.donation.quantity,
                pickupWindowStart: active.donation.pickupWindowStart
            }
        });
    }
    catch (error) {
        console.error('Error fetching active pickup:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getActivePickup = getActivePickup;
const acceptPickup = async (req, res) => {
    try {
        const keycloakId = req.user.id;
        const volunteer = await prisma_1.default.user.findUnique({ where: { keycloakId } });
        if (!volunteer)
            return res.status(404).json({ error: 'Volunteer not found' });
        const donationId = req.body.pickupId;
        if (!donationId)
            return res.status(400).json({ error: 'pickupId is required' });
        // Start transaction to avoid race conditions
        const result = await prisma_1.default.$transaction(async (tx) => {
            // Optimistic Concurrency Control: Attempt to update the status directly
            const updatedDonation = await tx.foodDonation.updateMany({
                where: { id: donationId, status: 'Claimed' },
                data: { status: 'Assigned' }
            });
            if (updatedDonation.count === 0) {
                throw new Error('Donation is not available for pickup or already assigned');
            }
            // Fetch the updated donation with donor info
            const donation = await tx.foodDonation.findUnique({
                where: { id: donationId },
                include: { donor: true }
            });
            if (!donation)
                throw new Error('Donation not found after update');
            // Create assignment
            const assignment = await tx.pickupAssignment.create({
                data: {
                    donationId,
                    volunteerId: volunteer.id,
                    deliveryStatus: 'Assigned',
                }
            });
            return { assignment, donation };
        });
        // Notify
        try {
            await (0, rabbitmq_1.publishEvent)('notification_queue', {
                eventType: 'PickupStatusChanged',
                payload: {
                    donorId: result.donation.donor.userId,
                    donationId: result.donation.id,
                    volunteerId: volunteer.id,
                    message: `A volunteer has accepted the pickup for your donation.`,
                }
            });
        }
        catch (eventError) {
            console.error('Failed to publish PickupStatusChanged event:', eventError);
        }
        return res.status(201).json(result.assignment);
    }
    catch (error) {
        console.error('Error accepting pickup:', error);
        return res.status(400).json({ error: error.message || 'Internal server error' });
    }
};
exports.acceptPickup = acceptPickup;
const updatePickupStatus = async (req, res) => {
    try {
        const id = req.params.id; // pickup assignment id
        const status = req.body.status; // PickedUp, Delivered
        if (status !== 'PickedUp' && status !== 'Delivered') {
            return res.status(400).json({ error: 'Invalid status. Must be PickedUp or Delivered.' });
        }
        const keycloakId = req.user.id;
        const volunteer = await prisma_1.default.user.findUnique({ where: { keycloakId } });
        if (!volunteer)
            return res.status(404).json({ error: 'Volunteer not found' });
        const assignment = await prisma_1.default.pickupAssignment.findUnique({
            where: { id },
            include: {
                donation: {
                    include: { donor: true }
                }
            }
        });
        if (!assignment)
            return res.status(404).json({ error: 'Assignment not found' });
        if (assignment.volunteerId !== volunteer.id) {
            return res.status(403).json({ error: 'Not authorized to update this assignment' });
        }
        // State transition validation
        if (status === 'PickedUp' && assignment.deliveryStatus !== 'Assigned') {
            return res.status(400).json({ error: 'Can only transition to PickedUp from Assigned' });
        }
        if (status === 'Delivered' && assignment.deliveryStatus !== 'PickedUp') {
            return res.status(400).json({ error: 'Can only transition to Delivered from PickedUp' });
        }
        const updated = await prisma_1.default.pickupAssignment.update({
            where: { id },
            data: {
                deliveryStatus: status,
                ...(status === 'PickedUp' ? { pickupTime: new Date() } : {}),
                ...(status === 'Delivered' ? { deliveryTime: new Date() } : {})
            }
        });
        // Update donation status
        await prisma_1.default.foodDonation.update({
            where: { id: assignment.donationId },
            data: { status }
        });
        // Notify
        try {
            await (0, rabbitmq_1.publishEvent)('notification_queue', {
                eventType: 'PickupStatusChanged',
                payload: {
                    donorId: assignment.donation.donor.userId,
                    donationId: assignment.donationId,
                    volunteerId: volunteer.id,
                    message: `Delivery status updated to ${status}.`,
                }
            });
        }
        catch (eventError) {
            console.error('Failed to publish PickupStatusChanged event:', eventError);
        }
        return res.json(updated);
    }
    catch (error) {
        console.error('Error updating pickup status:', error);
        return res.status(400).json({ error: error.message || 'Internal server error' });
    }
};
exports.updatePickupStatus = updatePickupStatus;
