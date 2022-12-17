// SOURCE : https://github.com/AnshikaG0219/web-paint-final

// TODO
// - Le scroll sur canvas
// - Le footer
// - Le menu en mode Easter egg
// - limit to brush size

let session = null;
let currentWindowWidth;

/**
 * SESSION
 */
const logs = document.querySelector("#logs");
const online = document.querySelector("#online");
const loginModal = document.querySelector("#login");
const logoutButton = document.querySelector("#logout");
const emitUserLogged = (s) => socket.emit("userLogged", s);
const emitUserLogout = (s) => socket.emit("userLogout", s);
// Check if local storage for paint exists
if (window.localStorage.getItem("devgirlpaint")) {
  // If already login, retrieve session
  session = JSON.parse(window.localStorage.getItem("devgirlpaint"));
  // log
  logs.innerHTML += `<li>Welcome back ${session.username}.</li>`;
  // Socket IO
  emitUserLogged(session);
} else {
  // If log out
  // Display login form
  loginModal.style.display = "block";
  logoutButton.style.display = "none";
  // form eventlistener
  loginModal.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = e.target.querySelector("input#username").value;
    if (username && username !== "") {
      session = { username, id: `${username}#${Math.random() * 4000}` };
      // Save dans le local storage
      window.localStorage.setItem("devgirlpaint", JSON.stringify(session));
      // Hide login modal
      loginModal.style.display = "none";
      logoutButton.style.display = "block";
      // Log connected
      logs.innerHTML += `<li>Bienvenue ${username}, tu as été correctement connecté.</li>`;
      // Socket IO
      emitUserLogged(session);
    }
  });
}
// Logout event listener
logoutButton.addEventListener("click", () => {
  window.localStorage.removeItem("devgirlpaint");
  // Display login form
  loginModal.style.display = "block";
  logoutButton.style.display = "none";

  // Log connected
  logs.innerHTML += `<li>Bye bye, à bientôt !</li>`;
  // Socket IO
  emitUserLogout(session);

  // Null session
  session = null;
});

/**
 * CANVAS
 */
let root = document.documentElement;
let brushthickness = 7;
let luminosity = 50;
let saturation = 50;
let hue = Math.random() * 360;
let color = (s, l) => "hsl(" + hue + " " + s + "% " + l + "%)";
root.style.setProperty("--base-color", color(saturation, luminosity));
root.style.setProperty("--color", color(saturation, luminosity));
let pos = { x: 0, y: 0 };
let eraser = false;
let brush = true;
const eraserButton = document.querySelector("#eraser");
const brushButton = document.querySelector("#brush");

// Canvas
const canvas = document.querySelector("#canvas");
const canvasContainer = document.querySelector("#canvas-container");
let offsetX = canvas.offsetLeft;
let offsetY = canvas.offsetTop;
let ctx = canvas.getContext("2d");
// Desktop
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mousedown", (e) => {
  setPosition(e);
  draw(e);
});
canvas.addEventListener("mouseenter", setPosition);
// Mobile
canvas.addEventListener("touchmove", draw);
canvas.addEventListener("touchend", setPosition);
canvas.addEventListener("touchstart", (e) => {
  setPosition(e);
  draw(e);
});
function draw(e) {
  if (!session) return;
  // if mouse is not clicked, do not go further
  if (e.buttons !== 1) return;

  ctx.beginPath(); // begin the drawing path
  if (brush) ctx.fillStyle = color(saturation, luminosity);
  // hex color of line
  else if (eraser) ctx.fillStyle = color(saturation, 100); // hex color of line
  setPosition(e);

  ctx.fillRect(
    pos.x - brushthickness / 2,
    pos.y - brushthickness / 2,
    brushthickness,
    brushthickness
  );

  socket.emit("draw", {
    id: session.id,
    color: color(saturation, eraser ? 100 : luminosity),
    x: pos.x,
    y: pos.y,
    size: brushthickness,
  });
}
function setPosition(e) {
  pos.x = parseInt(e.clientX + canvasContainer.scrollLeft - offsetX);
  pos.y = parseInt(e.clientY + canvasContainer.scrollTop - offsetY);

  socket.emit("mousemove", { x: pos.x, y: pos.y });
}

function initInput(input, value) {
  if (input.name === "saturation") input.value = saturation;
  else if (input.name === "luminosity") input.value = luminosity;
  else if (input.name === "size") input.value = brushthickness;
  value.innerHTML = input.value;
}
function editColor(input, value) {
  value.innerHTML = input.value;

  if (input.name === "saturation") saturation = input.value;
  else if (input.name === "luminosity") luminosity = input.value;
  else if (input.name === "size") brushthickness = input.value;
  root.style.setProperty("--color", color(saturation, luminosity));
}

// Toolbar
document.querySelectorAll(".properties__item").forEach((item) => {
  // submenu
  const submenu = item.querySelector(".properties__item__submenu");
  if (submenu) {
    const input = submenu.querySelector("input");
    if (input) {
      const value = submenu.querySelector("span");
      // Init
      initInput(input, value);

      input.addEventListener("input", () => editColor(input, value));
    }
  }
});
eraserButton.addEventListener("click", () => {
  eraser = true;
  eraserButton.classList.toggle("active");
  brush = false;
  brushButton.classList.toggle("active");
});
brushButton.addEventListener("click", () => {
  brush = true;
  eraserButton.classList.toggle("active");
  eraser = false;
  brushButton.classList.toggle("active");
});
document.querySelector("#save").addEventListener("click", (save) => {
  const link = document.createElement("a");
  link.download = "sketch.png";
  link.href = canvas.toDataURL();
  link.click();
  link.delete;
});

// add window event listener to trigger when window is resized
window.addEventListener("resize", resize);
function resize() {
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  const data = ctx.getImageData(0, 0, currentWindowWidth, currentWindowWidth);
  console.log(window.innerWidth * 2);
  canvas.width = displayWidth;
  canvas.height = displayHeight;
  if (data) ctx.putImageData(data, 0, 0);

  currentWindowWidth = window.innerWidth;
}

// Init size
currentWindowWidth = window.innerWidth;
canvas.width = currentWindowWidth * 2;
canvas.height = currentWindowWidth * 2;

// draw a line every *step* pixels
const step = 50;
// set our styles
ctx.save();
ctx.strokeStyle = "gray"; // line colors
ctx.fillStyle = "black"; // text color
ctx.font = "14px Monospace";
ctx.lineWidth = 0.35;

// draw vertical from X to Height
for (let x = 0; x < canvas.clientWidth; x += step) {
  // draw vertical line
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, canvas.clientWidth);
  ctx.stroke();

  // draw text
  ctx.fillText(x, x, 12);
}

// draw horizontal from Y to Width
for (let y = 0; y < canvas.clientHeight; y += step) {
  // draw horizontal line
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(canvas.clientHeight, y);
  ctx.stroke();

  // draw text
  ctx.fillText(y, 0, y);
}

// restore the styles from before this function was called
ctx.restore();
