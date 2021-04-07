const express = require("express");
const mongoose = require("mongoose");
const produroute = require('../shopify/routes/produroute')

const app = express();

// app.use(express.json());

mongoose.connect(
  "mongodb+srv://star:rh65kq@cluster0.qnu5u.mongodb.net/shopifypro?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  }
);

app.use("/",produroute);
app.listen(3000, () => {
  console.log("Server is running...");
});