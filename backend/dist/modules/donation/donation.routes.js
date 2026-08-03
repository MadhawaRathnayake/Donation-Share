"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const donation_controller_1 = require("./donation.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Only logged in Donors can post
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('Donor'), donation_controller_1.createDonation);
// Any logged in user (e.g. Recipient) can list active donations
router.get('/', auth_middleware_1.authenticate, donation_controller_1.listDonations);
exports.default = router;
