const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
// Socket IO
const { Server } = require("socket.io");
const io = new Server(server);

// Public files are in public directory
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", async (socket) => {
  const sockets = await io.fetchSockets();
  console.log(sockets);

  // io.emit("online", socket.);

  // When user logged in
  socket.on("userLogged", (user) => {
    socket.user = user;
    io.emit("userLogged", { ...user, socketId: socket.id });
    socket.join("paint");
  });

  // When user logged out
  socket.on("userLogout", (user) => {
    io.emit("userLogout", user);
  });

  // When user draw
  socket.on("draw", (ellipse) => {
    io.emit("draw", ellipse);
  });

  // User's mouse moving
  socket.on("mousemove", (pos) => console.log(pos));

  socket.on("disconnect", () => {
    if (socket.user) io.emit("userLogout", socket.user);
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log("listening on *:" + process.env.PORT || 5000);
});
