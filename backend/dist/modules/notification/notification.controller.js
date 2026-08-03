"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.getNotifications = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const getNotifications = async (req, res) => {
    try {
        const keycloakId = req.user.id;
        const user = await prisma_1.default.user.findUnique({
            where: { keycloakId }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found in local DB' });
        }
        const notifications = await prisma_1.default.notification.findMany({
            where: { userId: user.id },
            orderBy: { sentAt: 'desc' },
            take: 20
        });
        return res.json({ notifications });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res) => {
    try {
        const keycloakId = req.user.id;
        const notificationId = req.params.id;
        const user = await prisma_1.default.user.findUnique({
            where: { keycloakId }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found in local DB' });
        }
        const notification = await prisma_1.default.notification.updateMany({
            where: {
                id: notificationId,
                userId: user.id // ensure they own it
            },
            data: { readStatus: true }
        });
        return res.json({ notification });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.markAsRead = markAsRead;
