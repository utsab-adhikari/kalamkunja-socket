import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("⚠️ Please define MONGO_URI in .env");
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected");
};

export default connectDB;
