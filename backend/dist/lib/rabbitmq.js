"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishEvent = exports.connectRabbitMQ = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
let connection = null;
let channel = null;
const connectRabbitMQ = async () => {
    try {
        connection = await amqplib_1.default.connect('amqp://user:password@localhost:5672');
        channel = await connection.createChannel();
        console.log('Connected to RabbitMQ');
    }
    catch (error) {
        console.error('RabbitMQ connection error:', error);
    }
};
exports.connectRabbitMQ = connectRabbitMQ;
const publishEvent = async (queue, message) => {
    if (!channel) {
        console.error('RabbitMQ channel not established');
        return;
    }
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
    console.log(`Event published to queue ${queue}:`, message);
};
exports.publishEvent = publishEvent;
