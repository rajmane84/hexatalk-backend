import mongoose from 'mongoose';

export async function connectDB(uri: string) {
  try {
    await mongoose.connect(uri);
    console.log('✅ Mongoose connection successfull');
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}
