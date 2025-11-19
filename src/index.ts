import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './db/mongoDB';
import { initWebSocket } from './ws';

// This will inject environment variables
dotenv.config();

// import routers
import authRouter from './router/auth.route';
import userRouter from './router/user.route';
import messageRouter from './router/message.route';

const app = express();
const PORT = process.env.PORT || 8001;
const mongo_uri = 'mongodb://localhost:6000/HexaTalk';

// Setting up mongoose connection
connectDB(process.env.MONGO_URI || mongo_uri);

// starting ws server
initWebSocket(8081);

app.use(
  cors({
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
    origin: process.env.CORS_ORIGIN!,
  }),
);
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());

app.get('/test', (req, res) => {
  return res.send('Hey there!!');
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/messages', messageRouter);

app.listen(PORT, () => {
  console.log(`✅ HTTP Server running on PORT ${PORT}`);
});
