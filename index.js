const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.json({ message: "Welcome" });
});

const port = 4200;
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
