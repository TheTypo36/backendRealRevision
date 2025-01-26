import express from "express";
const app = express();
const port = 4000;

app.get("/", (req, res) => {
  res.send("<h1>hello world</h1>");
});

app.listen(port, () => {
  console.log(`server is runing at ${port}`);
});
