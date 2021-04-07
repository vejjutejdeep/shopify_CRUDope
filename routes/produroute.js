const express = require("express");
const prod = require("../controllers/prodcontrol")
const app = express();

app.use(express.json())



app.get("/shopify", prod.install);
app.get("/shopify/callback", prod.callb);
app.get("/getproducts/:storename", prod.getproducts);
app.post("/createproducts/:storename", prod.createproducts);
app.patch("/updateproducts/:productid", prod.updateproducts);
app.delete("/deleteproducts/:productid", prod.deleteproducts);

module.exports = app;