import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import donationRoutes from './modules/donation/donation.routes';
import { connectRabbitMQ } from './lib/rabbitmq';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'FoodShare API' });
});

app.use('/api/donations', donationRoutes);

app.listen(port, async () => {
  console.log(`FoodShare API is running at http://localhost:${port}`);
  await connectRabbitMQ();
});
