import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );

    console.log(
      `\n mongoDB connected !! DB Host: ${connectionInstance.connection.host}`
    ); // u can also
    //connectionInstance.connection.host
  } catch (error) {
    console.error("error while connecting to database", error);
    throw error;
  }
};

export default connectDB;
