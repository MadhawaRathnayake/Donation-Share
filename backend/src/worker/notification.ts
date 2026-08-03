import amqp from 'amqplib';
import prisma from '../lib/prisma';
import { sendEmail } from '../lib/email';
import { sendSMS } from '../lib/sms';
import { NotificationRules } from '../config/notification-rules';

const QUEUE_NAME = 'notification_queue';
const MAX_RETRIES = 3;

interface NotificationMessage {
  eventType: string;
  payload: any;
  retryCount?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function processMessage(msg: NotificationMessage) {
  const { eventType, payload } = msg;
  const rule = (NotificationRules as any)[eventType];

  if (!rule) {
    console.log(`No rule defined for event: ${eventType}`);
    return;
  }

  // Example payload structure:
  // { donorId, recipientId, volunteerId, donationId, message }
  
  const targetUserIds: string[] = [];
  if (rule.notifyDonor && payload.donorId) targetUserIds.push(payload.donorId);
  if (rule.notifyRecipient && payload.recipientId) targetUserIds.push(payload.recipientId);
  if (rule.notifyVolunteer && payload.volunteerId) targetUserIds.push(payload.volunteerId);

  // Fetch user details for contact info
  const users = await prisma.user.findMany({
    where: { id: { in: targetUserIds } }
  });

  for (const user of users) {
    // 1. InApp Notification
    if (rule.channels.includes('InApp')) {
      await prisma.notification.create({
        data: {
          eventType,
          message: payload.message || `New ${eventType} event`,
          userId: user.id,
          donationId: payload.donationId || null,
          channel: 'InApp',
        }
      });
    }

    // 2. Email
    if (rule.channels.includes('Email')) {
      await sendEmail(
        user.email,
        `FoodShare Update: ${eventType}`,
        payload.message || `You have a new update for your donation.`
      );
    }

    // 3. SMS (assuming user has a phone number, but we don't have it in schema, 
    // so we mock it if it's not available or use a dummy number)
    if (rule.channels.includes('SMS')) {
      const phoneNumber = '+15551234567'; // Fallback dummy number
      await sendSMS(phoneNumber, payload.message || `FoodShare Alert: ${eventType}`);
    }
  }
}

async function startWorker() {
  let connection: any = null;
  
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://user:password@localhost:5672');
    const channel = await connection.createChannel();
    
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.prefetch(10);
    console.log(`Notification worker started. Listening on ${QUEUE_NAME}...`);

    channel.consume(QUEUE_NAME, async (msg: any) => {
      if (!msg) return;

      const content = msg.content.toString();
      let parsed: NotificationMessage;
      
      try {
        parsed = JSON.parse(content);
        parsed.retryCount = parsed.retryCount || 0;
      } catch (err) {
        console.error('Invalid message format:', content);
        channel.ack(msg);
        return;
      }

      try {
        console.log(`Processing event: ${parsed.eventType}`);
        await processMessage(parsed);
        channel.ack(msg);
      } catch (err) {
        console.error(`Error processing message:`, err);
        
        if (parsed.retryCount < MAX_RETRIES) {
          console.log(`Retrying message... (${parsed.retryCount + 1}/${MAX_RETRIES})`);
          parsed.retryCount += 1;
          
          // Exponential backoff
          await sleep(Math.pow(2, parsed.retryCount) * 1000);
          
          channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(parsed)), { persistent: true });
        } else {
          console.error(`Message exceeded max retries, dropping:`, parsed);
        }
        channel.ack(msg); // Ack the original message since we either re-queued it or dropped it
      }
    });

  } catch (error) {
    console.error('Failed to start notification worker:', error);
    // Exit so it can be restarted by a process manager (e.g. docker/pm2)
    process.exit(1);
  }
}

// If run directly
if (require.main === module) {
  startWorker();
}
