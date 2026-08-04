import mongoose from "mongoose";


let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  console.log("Connecting to MongoDB Successfully");
  if (!uri) {
    throw new Error("MONGODB_URI .env mein set nahi hai");
  }

  await mongoose.connect(uri);
  isConnected = true;
  console.log("MongoDB connected");
}
