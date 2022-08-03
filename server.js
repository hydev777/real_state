const express = require('express');
var cors = require('cors')
var app = require('express')();
const port = 4000;
const mongoose = require('mongoose');
var routes = require('./routes/routes');
const path = require('path');
const http = require('http');
const passport = require("passport");

app.use(cors());

app.use('/images', express.static(path.join(process.cwd(), '/images')));
app.use(express.json());
app.use(express.urlencoded({ extended: true } ));
app.use(passport.initialize());
require("./config/passport")(passport);
app.use(routes);

async function main() {
  const db = await mongoose.connect('mongodb://localhost:27017/bienes-raices', { autoIndex: false });
  const session = await db.startSession();
}

main().catch(err => console.log(err));

// app.listen(port, () => {
//   console.log(`Example app listening at http://localhost:${port}`)
// })

http.createServer(app).listen(4000, "0.0.0.0");
