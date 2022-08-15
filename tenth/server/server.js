import '@babel/polyfill';
// import compression from "compression";
import express from "express";
//import bodyParser from 'body-parser';
import path from "path";
import router from "./router/main.router";
import cors from "cors";
import { PORT } from "../common/constants/common.constants";
import workingController from "./controller/work/work.controller";

const app = express();
app.set('port', PORT);

// app.use(compression());

//sử dụng thư mục static
app.use("/static", express.static(path.resolve(__dirname, "public")));

//middleware được sử dụng để nhận các request từ client
app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));
app.use(express.urlencoded({ extended: true }));

//socket
const http = require('http');
const server = http.createServer(app);

workingController(server,app);

server.listen(app.get('port'), () => console.log("######## app running on port " + PORT + " ########"));