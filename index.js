import express from "express";
import http from "http";
import { Server } from "socket.io";

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, Image } from "canvas";
import { createWriteStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const TWITCH_REDIRECT_URI = "https://paint.lauradurieux.dev";
const TWITCH_TOKEN_URI = "https://id.twitch.tv/oauth2/token";
const TWITCH_USER_URI = "https://api.twitch.tv/helix/users";
const TWITCH_MODERATOR_URI =
  "https://api.twitch.tv/helix/moderation/moderators";

const canvas = createCanvas(2048, 2048);
const ctx = canvas.getContext("2d");

const imageFilename = "image.png";

let imageSrc;
let lastImageDataURITimestamp = Date.now();
let lastDrawTimestamp = Date.now();

const __dirname = dirname(fileURLToPath(import.meta.url));

if (existsSync(join(__dirname, imageFilename))) {
  readFile(join(__dirname, imageFilename), (err, png) => {
    if (err) throw err;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.onerror = (err) => {
      throw err;
    };
    img.src = png;
  });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 5001;

let connectedUsers = [];

function removeUserWithID(arr, id) {
  const user = arr.findIndex((u) => u.id === id);
  arr.splice(user, 1);

  return arr;
}

function isUserAlreadyConnected(id) {
  return connectedUsers.some((u) => u.id === id);
}

function getConnectedUser(id) {
  return connectedUsers.find((u) => u.id === id);
}

setInterval(() => {
  if (connectedUsers.length > 0) {
    connectedUsers = connectedUsers.map((u) => ({ ...u, drawNumber: 0 }));
  }
}, 10000);

app.get("/", async (req, res) => {
  if ("error" in req.query) {
    // Error

    res.sendFile(__dirname + "/dist/index.html");
  }

  if ("code" in req.query) {
    const code = req.query.code;

    // Fetch access token
    const accessTokenRes = await fetch(TWITCH_TOKEN_URI, {
      method: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: TWITCH_REDIRECT_URI,
      }),
    });

    const data = await accessTokenRes.json();

    if (data.status !== 200) {
      // Error

      res.sendFile(__dirname + "/dist/index.html");
    }

    if ("access_token" in data && "expires_in" in data) {
      const { access_token, expires_in } = data;

      const res = await fetch(TWITCH_USER_URI, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Client-Id": process.env.TWITCH_CLIENT_ID,
        },
      });
      if (!res.ok || res.status !== 200) {
        throw new Error("Login to Twitch failed");
      }

      const resData = await res.json();

      const twitchData = resData.data;

      if (twitchData.length > 0) {
        const twitchUser = twitchData[0];

        const { id } = twitchUser;

        // Check if user is banned

        // Check if user moderator
        const modoRes = await fetch(
          TWITCH_MODERATOR_URI + `?broadcaster_id=${id}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Client-Id": process.env.TWITCH_CLIENT_ID,
            },
          }
        );

        console.log(await modoRes.json());
      }

      res.cookie("multi-paint-devgirl", access_token, {
        expires: new Date(Date.now() + expires_in * 1000),
      });
    }
  }

  res.sendFile(__dirname + "/dist/index.html");
});

// Public files are in public directory
app.use(express.static("dist"));

io.on("connection", async (socket) => {
  if (lastDrawTimestamp > lastImageDataURITimestamp) {
    imageSrc = canvas.toDataURL();
    lastImageDataURITimestamp = Date.now();
    socket.emit("imageData", { src: imageSrc });
  } else {
    socket.emit("imageData", { src: imageSrc });
  }

  // When user logged in
  socket.on("userLogged", (user, callback) => {
    let newUser = {
      ...user,
      drawNumber: 0,
    };
    console.log("connected", connectedUsers);

    if (!isUserAlreadyConnected(newUser.id)) connectedUsers.push(newUser);
    else {
      newUser = getConnectedUser(newUser.id);
      newUser.username = user.username; // If user changed their username on Twitch
    }

    socket.user = newUser;

    callback({ ok: true, user: newUser, connected: connectedUsers });

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

    if (user && user.drawNumber < 2000) {
      user.drawNumber++;

      io.emit("draw", ellipse);

      callback({ ok: true, id: ellipse.id });

      draw(ellipse);
    } else {
      callback({ ok: false, id: ellipse.id });
    }
  });

  socket.on("disconnect", () => {
    if (socket.user) io.emit("userLogout", socket.user);
  });
});

server.listen(port, () => {
  console.log("listening on *:" + port);
});

async function draw(ellipse) {
  lastDrawTimestamp = Date.now();
  ctx.beginPath(); // begin the drawing path
  ctx.fillStyle = ellipse.color; // hex color of line
  if (ellipse.tool === "BRUSH") {
    ctx.globalCompositeOperation = "source-over";
  } else if (ellipse.tool === "ERASER") {
    ctx.globalCompositeOperation = "destination-out";
  }

  ctx.fillRect(
    ellipse.x - ellipse.size / 2,
    ellipse.y - ellipse.size / 2,
    ellipse.size,
    ellipse.size
  );
}

// ----------------------------
// - Saving image before exit -
// ----------------------------

// only works when there is no task running
// because we have a server always listening port, this handler will NEVER execute
process.on("beforeExit", async () => {
  await saveImage();
});

// only works when the process normally exits
// on windows, ctrl-c will not trigger this handler (it is unnormal)
// unless you listen on 'SIGINT'
process.on("exit", async () => {
  await saveImage();
});

// just in case some user like using "kill"
process.on("SIGTERM", async () => {
  await saveImage();
  process.exit(0);
});

// catch ctrl-c, so that event 'exit' always works
process.on("SIGINT", async () => {
  await saveImage();
  process.exit(0);
});

// what about errors
// try remove/comment this handler, 'exit' event still works
process.on("uncaughtException", async () => {
  await saveImage();
  process.exit(1);
});

function saveImage() {
  return new Promise((resolve, reject) => {
    const out = createWriteStream(join(__dirname, imageFilename));
    const stream = canvas.createPNGStream();

    stream.pipe(out);

    out.on("finish", () => {
      console.log("The PNG file was created.");
      resolve();
    });

    out.on("error", reject);
    stream.on("error", reject);
  });
}
