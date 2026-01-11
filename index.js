import sanitizeHtml from "sanitize-html";
import express from "express";
import http from "http";
import { Server } from "socket.io";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let connectedUsers = [];

function removeUserWithID(arr, id) {
  const user = arr.findIndex((u) => u.id === id);
  arr.splice(user, 1);

  return arr;
}

function isUserAlreadyConnected(user) {
  return connectedUsers.some((u) => u.id === user.id);
}

setInterval(() => {
  if (connectedUsers.length > 0) {
    console.log("draw number reset", connectedUsers);
    connectedUsers = connectedUsers.map((u) => ({ ...u, drawNumber: 0 }));
  }
}, 10000);

// Public files are in public directory
app.use(express.static("dist"));

app.get("/", (_, res) => {
  res.sendFile(__dirname + "/dist/index.html");
});

io.on("connection", async (socket) => {
  // When user logged in
  socket.on("userLogged", (user) => {
    const username = sanitizeHtml(user.username).trim();

    if (!username || username === "") {
      io.emit("errorBadUsername");
      return;
    }

    const newUser = {
      ...user,
      username: username,
      drawNumber: 0,
    };
    console.log(connectedUsers);

    if (!isUserAlreadyConnected(newUser)) connectedUsers.push(newUser);

    socket.user = user;
    io.emit("userLogged", { ...newUser, socketId: socket.id }, connectedUsers);
    socket.join("paint");
  });

  // When user logged out
  socket.on("userLogout", (user) => {
    removeUserWithID(connectedUsers, user.id);

    io.emit("userLogout", user, connectedUsers);
  });

  // When user draw
  socket.on("draw", (ellipse, callback) => {
    const user = connectedUsers.find((u) => u.id === ellipse.id);

    if (user && user.drawNumber < 20000) {
      user.drawNumber++;

      io.emit("draw", ellipse);

      callback({ ok: true });
    } else {
      callback({ ok: false });
    }
  });

  socket.on("disconnect", () => {
    if (socket.user) io.emit("userLogout", socket.user);
  });
});

server.listen(process.env.PORT || 5001, () => {
  console.log("listening on *:" + process.env.PORT || 5001);
});
