const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const userRouter = require("./Routes/routes");
const MenuSec = require("./Routes/menu");
const fileRouter = require("./Routes/UploadImages");
const bannerRouter=require("./Routes/uploadbanner");
const categoryRouter = require("./Routes/uploadCategory");
const cartRouter = require("./Routes/cartItems");
const billsRouter = require("./Routes/bills");
const comboRouter = require("./Routes/uploadCombo");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const corsOptions = {
  origin: "*",
  method: "GET,POST,PUT,PATCH,DELETE",
  preFlightContinue: false,
  OptionSucessStatus: 204,
};
app.use(cors(corsOptions));

app.use("/user", userRouter);
app.use("/menu", MenuSec);
app.use("/files", fileRouter);
app.use('/banner',bannerRouter)
app.use('/categories',categoryRouter)
app.use('/cart',cartRouter)
app.use('/bills',billsRouter)
app.use("/combos",comboRouter)


app.use((req, res) => {
  res.status(400).send("<h1>Error found</h1>");
});

app.listen(3500, () => {
  console.log("Server is running");
});
