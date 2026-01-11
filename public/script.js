// SOURCE : https://github.com/AnshikaG0219/web-paint-final

// TODO
// - Le scroll sur canvas
// - Le footer
// - Le menu en mode Easter egg
// - limit to brush size

let session = null;
let currentWindowWidth;

/**
 * USER COLOR
 */
let root = document.documentElement;
let luminosity = 50;
let saturation = 50;
let hue = Math.random() * 360;
let color = (h, s, l) => "hsl(" + h + " " + s + "% " + l + "%)";
let setColor = (h, s, l, init = false) => {
  if (init) root.style.setProperty("--base-color", color(h, s, l));
  root.style.setProperty("--color", color(h, s, l));
};

/**
 * SESSION
 */
const logs = document.querySelector("#logs-list");
const online = document.querySelector("#online-users");
const loginModal = document.querySelector("#login");
const logoutButton = document.querySelector("#logout");
const errorUsername = document.querySelector("#error-username");
const emitUserLogged = (s) => socket.emit("userLogged", s);
const emitUserLogout = (s) => socket.emit("userLogout", s);
// Check if local storage for paint exists
if (window.localStorage.getItem("devgirlpaint")) {
  // If already login, retrieve session
  session = JSON.parse(window.localStorage.getItem("devgirlpaint"));
  // Set color
  hue = session.hue;
  setColor(hue, luminosity, saturation, true);
  // log
  logs.innerHTML += `<li>Welcome back ${session.username}.</li>`;
  // Socket IO
  emitUserLogged(session);
} else {
  // If logged out
  // Display login form
  loginModal.showModal();
  logoutButton.style.display = "none";

  setColor(hue, luminosity, saturation, true);

  // form eventlistener
  loginModal.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    errorUsername.innerHTML = "";
    const username = e.target.querySelector("input#username").value.trim();

    if (username && username !== "") {
      session = {
        username,
        id: `${username}#${Math.random() * 4000}`,
        hue,
      };
      // Save dans le local storage
      window.localStorage.setItem("devgirlpaint", JSON.stringify(session));
      // Hide login modal
      loginModal.close();
      logoutButton.style.display = "inline-block";

      // Log connected
      logs.innerHTML += `<li>Bienvenue ${username}, tu as été correctement connecté.</li>`;
      // Socket IO
      emitUserLogged(session);
    } else {
      // TODO: Display error
    }
  });
}
// Logout event listener
logoutButton.addEventListener("click", () => {
  window.localStorage.removeItem("devgirlpaint");
  // Display login form
  loginModal.showModal();
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
let brushthickness = 7;
let pos = { x: 0, y: 0 };
let eraser = false;
let brush = true;
const eraserButton = document.querySelector("#eraser");
const brushButton = document.querySelector("#brush");

// Canvas
const canvas = document.querySelector("#canvas");
const canvasGrid = document.querySelector("#canvas-grid");
const canvasContainer = document.querySelector("#canvas-container");
let offsetX = canvas.offsetLeft;
let offsetY = canvas.offsetTop;
let ctx = canvas.getContext("2d");
let ctxGrid = canvasGrid.getContext("2d");
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
  ctx.fillStyle = color(hue, saturation, luminosity); // hex color of line
  if (brush) {
    ctx.globalCompositeOperation = "source-over";
  }
  else if (eraser) {
    ctx.globalCompositeOperation = "destination-out";
  }
  setPosition(e);

  ctx.fillRect(
    pos.x - brushthickness / 2,
    pos.y - brushthickness / 2,
    brushthickness,
    brushthickness
  );

  socket.emit("draw", {
    id: session.id,
    color: color(hue, saturation, luminosity),
    x: pos.x,
    y: pos.y,
    size: brushthickness,
  });
}

function setPosition(e) {
  pos.x = parseInt(e.layerX);
  pos.y = parseInt(e.layerY);

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

  setColor(hue, saturation, luminosity);
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
  canvas.width = displayWidth;
  canvasGrid.width = displayWidth;

  canvas.height = displayHeight;
  canvasGrid.height = displayHeight;

  if (data) ctx.putImageData(data, 0, 0);

  currentWindowWidth = window.innerWidth;
}

// Init size
currentWindowWidth = window.innerWidth;

canvas.width = currentWindowWidth * 2;
canvasGrid.width = currentWindowWidth * 2;

canvas.height = currentWindowWidth * 2;
canvasGrid.height = currentWindowWidth * 2;

// draw a line every *step* pixels
const step = 50;
// set our styles
ctxGrid.save();
ctxGrid.strokeStyle = "gray"; // line colors
ctxGrid.lineWidth = 0.35;

// draw vertical from X to Height
for (let x = 0; x < canvas.clientWidth; x += step) {
  // draw vertical line
  ctxGrid.beginPath();
  ctxGrid.moveTo(x, 0);
  ctxGrid.lineTo(x, canvas.clientWidth);
  ctxGrid.stroke();
}

// draw horizontal from Y to Width
for (let y = 0; y < canvas.clientHeight; y += step) {
  // draw horizontal line
  ctxGrid.beginPath();
  ctxGrid.moveTo(0, y);
  ctxGrid.lineTo(canvas.clientHeight, y);
  ctxGrid.stroke();
}

// restore the styles from before this function was called
ctxGrid.restore();


const modalButtons = document.querySelectorAll("button[data-modal]");
modalButtons.forEach(button => {
  const modal = document.querySelector(`#${button.dataset.modal}`);
  const closeModalButton = modal.querySelector("button[autofocus]");
  console.log(modal)

  button.addEventListener("click", () => {
    modal.showModal();
  })
  closeModalButton.addEventListener("click", () => {
    modal.close();
  })
})