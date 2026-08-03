"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const donation_routes_1 = __importDefault(require("./modules/donation/donation.routes"));
const notification_routes_1 = __importDefault(require("./modules/notification/notification.routes"));
const pickup_routes_1 = __importDefault(require("./modules/pickup/pickup.routes"));
const rabbitmq_1 = require("./lib/rabbitmq");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'FoodShare API' });
});
app.use('/api/donations', donation_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/pickups', pickup_routes_1.default);
app.listen(port, async () => {
    console.log(`FoodShare API is running at http://localhost:${port}`);
    await (0, rabbitmq_1.connectRabbitMQ)();
});
