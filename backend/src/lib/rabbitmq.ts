import amqp from 'amqplib';
import { env } from './env';
import type { DomainEventEnvelope } from './events';

/**
 * Thin RabbitMQ publisher for the event-driven notification backbone (ADR-002).
 *
 * Two rules drive this file:
 *  1. Publishing must never break the request that triggered it. Posting or
 *     cancelling a donation is the user-facing transaction; notification
 *     delivery is a side effect. If the broker is down the API still answers.
 *  2. Messages must survive a broker restart, so the queue is declared durable
 *     and messages are published persistent.
 */

// Version-agnostic types: amqplib has moved `createChannel` between the
// Connection and ChannelModel types across releases, so we infer instead of
// naming the types directly.
type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;

let connection: AmqpConnection | null = null;
let channel: AmqpChannel | null = null;
let connecting = false;

export const isRabbitConnected = () => channel !== null;

export const connectRabbitMQ = async (): Promise<void> => {
  if (!env.rabbitmq.enabled) {
    console.warn('[rabbitmq] disabled via RABBITMQ_ENABLED=false; events will be logged only');
    return;
  }
  if (channel || connecting) return;

  connecting = true;
  try {
    connection = await amqp.connect(env.rabbitmq.url);
    channel = await connection.createChannel();
    await channel.assertQueue(env.rabbitmq.notificationQueue, { durable: true });

    connection.on('close', () => {
      console.warn('[rabbitmq] connection closed; will reconnect on next publish');
      connection = null;
      channel = null;
    });
    connection.on('error', (error: unknown) => {
      console.error('[rabbitmq] connection error:', error);
    });

    console.log(`[rabbitmq] connected, queue "${env.rabbitmq.notificationQueue}" ready`);
  } catch (error) {
    connection = null;
    channel = null;
    console.error('[rabbitmq] connection failed:', error instanceof Error ? error.message : error);
  } finally {
    connecting = false;
  }
};

/**
 * Publishes a domain event. Returns true when the broker accepted the message
 * and false when it was dropped, and never throws: callers treat publication as
 * best-effort so a broker outage cannot fail a donation write.
 */
export const publishEvent = async (
  queue: string,
  message: DomainEventEnvelope<unknown> | Record<string, unknown>,
): Promise<boolean> => {
  if (!channel) {
    await connectRabbitMQ();
  }

  if (!channel) {
    console.warn('[rabbitmq] no channel available, event not published:', (message as { eventType?: string }).eventType);
    return false;
  }

  try {
    await channel.assertQueue(queue, { durable: true });
    const accepted = channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: 'application/json',
    });
    console.log(`[rabbitmq] published ${(message as { eventType?: string }).eventType} to "${queue}"`);
    return accepted;
  } catch (error) {
    console.error('[rabbitmq] publish failed:', error instanceof Error ? error.message : error);
    return false;
  }
};

/** Convenience wrapper so callers do not repeat the queue name. */
export const publishNotificationEvent = (message: DomainEventEnvelope<unknown>) =>
  publishEvent(env.rabbitmq.notificationQueue, message);

export const closeRabbitMQ = async (): Promise<void> => {
  try {
    await channel?.close();
    await connection?.close();
  } catch {
    // Already closed; nothing to do.
  } finally {
    channel = null;
    connection = null;
  }
};
