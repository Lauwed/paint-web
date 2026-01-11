const sanitizeHtml = require("sanitize-html");

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
// Socket IO
const { Server } = require("socket.io");
const io = new Server(server);

const connectedUsers = [];

function removeUserWithID(arr, id) {
  const user = arr.findIndex((u) => u.id === id);
  arr.splice(user, 1);

  return arr;
}

function isUserAlreadyConnected(user) {
  return connectedUsers.some((u) => u.id === user.id);
}

// Public files are in public directory
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", async (socket) => {
  // const sockets = await io.fetchSockets();

  // io.emit("online", socket.);

  // When user logged in
  socket.on("userLogged", (user) => {
    const username = sanitizeHtml(user.username).trim();

    if(!username || username === '') {
      io.emit("errorBadUsername");
      return;
    }

    const newUser = {
      ...user,
      username: username,
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
  socket.on("draw", (ellipse) => {
    io.emit("draw", ellipse);
  });

  // User's mouse moving
  // socket.on("mousemove", (pos) => console.log(pos));

  socket.on("disconnect", () => {
    if (socket.user) io.emit("userLogout", socket.user);
  });
});

server.listen(process.env.PORT || 5001, () => {
  console.log("listening on *:" + process.env.PORT || 5001);
});
