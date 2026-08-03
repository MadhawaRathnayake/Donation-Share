import amqp from 'amqplib';

let connection: any = null;
let channel: any = null;

export const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect('amqp://user:password@localhost:5672');
    channel = await connection.createChannel();
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
  }
};

export const publishEvent = async (queue: string, message: any) => {
  if (!channel) {
    console.error('RabbitMQ channel not established');
    return;
  }
  
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
  console.log(`Event published to queue ${queue}:`, message);
};
