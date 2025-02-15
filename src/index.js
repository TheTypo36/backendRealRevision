import "dotenv/config";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import { configDotenv } from "dotenv";
configDotenv({
  path: "./env",
});
connectDB().then(() => {
  app.on("error", (error) => {
    console.error("error in connecting serve to Db", error);
    throw error;
  });
  app.get("/", (req, res) => {
    res.send("<h1>hello world</h1>");
  });

  app.listen(process.env.PORT, () => {
    console.log(`serve is running on ${process.env.PORT} port`);
  });
});

// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}$`);
//     app.on("error", () => {
//       console.log("error", error); //this is particular func is purely if the database is
//       // but is unable to talk to express server
//       throw error;
//     });

//     app.listen(process.env.PORT, () => {
//       console.log(`server is runing at ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.error("error", error); // this error will occur if the db will not connect.
//     throw error;
//   }
// })();
