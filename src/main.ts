import {
  getColor,
  displayConnectedUsers,
  draw,
  drawEllipse,
  setColor,
  setPosition,
  initInput,
  editColor,
  emitUserLogged,
  emitUserLogout,
} from "./helpers";
import "./style.scss";
import type { Color, Shape, Tool, User } from "./types";

// SOURCE : https://github.com/AnshikaG0219/web-paint-final

// TODO
// - Le scroll sur canvas
// - Le footer
// - Le menu en mode Easter egg
// - limit to brush size

// @ts-ignore
let socket = io();
let connectedUsers: User[] = [];

let session: User | null = null;
let currentWindowWidth: number;

// Log in user
socket.on("userLogged", (user: User, connected: User[]) => {
  if ((session === null || user.id !== session.id) && logs) {
    logs.innerHTML += `<li>${user.username} a rejoint la partie !</li>`;
  } else {
    session = user;
  }

  connectedUsers = connected;
  displayConnectedUsers(connectedUsers, online);
});
// log out user
socket.on("userLogout", (user: User, connected: User[]) => {
  if ((session === null || user.id !== session.id) && logs)
    logs.innerHTML += `<li>${user.username} a quitté la partie !</li>`;

  connectedUsers = connected;
  displayConnectedUsers(connectedUsers, online);
});
// Error login
socket.on("errorBadUsername", () => {
  if (errorUsername)
    errorUsername.innerHTML = "Mauvais nom d'utilisateur.ice (:";
});

socket.on("draw", (ellipse: Shape) => drawEllipse(ellipse, session, ctx));

/**
 * USER COLOR
 */
let root = document.documentElement;

const color: Color = {
  l: 50,
  s: 50,
  h: Math.random() * 360,
};

/**
 * SESSION
 */
const logs: HTMLUListElement | null = document.querySelector("#logs-list");
const online: HTMLUListElement | null = document.querySelector("#online-users");
const loginModal: HTMLDialogElement | null = document.querySelector("#login");
const logoutButton: HTMLButtonElement | null =
  document.querySelector("#logout");
const errorUsername: HTMLParagraphElement | null =
  document.querySelector("#error-username");

const localStorage = window.localStorage.getItem("devgirlpaint");
// Check if local storage for paint exists
if (localStorage) {
  // If already login, retrieve session
  session = JSON.parse(localStorage) as User;

  // Set color
  color.h = session.hue;
  setColor(color, root, true);

  // log
  if (logs) {
    logs.innerHTML += `<li>Welcome back ${session.username}.</li>`;
  }

  // Socket IO
  emitUserLogged(session, socket);
} else {
  // If logged out
  // Display login form
  if (loginModal && logoutButton && errorUsername && logs) {
    loginModal.showModal();
    logoutButton.style.display = "none";

    setColor(color, root, true);

    // form eventlistener
    loginModal
      .querySelector("form")
      ?.addEventListener("submit", (e: SubmitEvent) => {
        e.preventDefault();
        errorUsername.innerHTML = "";
        const form: HTMLFormElement = e.target as HTMLFormElement;
        const usernameInput: HTMLInputElement | null =
          form.querySelector("input#username");
        const username = usernameInput?.value.trim();

        if (username && username !== "") {
          session = {
            username,
            id: `${username}#${Math.random() * 4000}`,
            hue: color.h,
            color: getColor(color.h, color.s, color.l),
          };

          // Save dans le local storage
          window.localStorage.setItem("devgirlpaint", JSON.stringify(session));

          // Hide login modal
          loginModal.close();
          logoutButton.style.display = "inline-block";

          // Log connected
          logs.innerHTML += `<li>Bienvenue ${username}, tu as été correctement connecté.</li>`;

          // Socket IO
          emitUserLogged(session, socket);
        } else {
          // TODO: Display error
        }
      });
  }
}
// Logout event listener
logoutButton?.addEventListener("click", () => {
  window.localStorage.removeItem("devgirlpaint");

  // Display login form
  loginModal?.showModal();
  logoutButton.style.display = "none";

  // Log connected
  if (logs) {
    logs.innerHTML += `<li>Bye bye, à bientôt !</li>`;
  }

  // Socket IO
  emitUserLogout(session, socket);

  // Null session
  session = null;
});

/**
 * CANVAS
 */
let brushThickness = 7;
let pos = { x: 0, y: 0 };
let tool: Tool = "BRUSH";
const eraserButton = document.querySelector("#eraser");
const brushButton = document.querySelector("#brush");

// Canvas
const canvas: HTMLCanvasElement | null = document.querySelector("#canvas");
const canvasGrid: HTMLCanvasElement | null =
  document.querySelector("#canvas-grid");
let ctx = canvas?.getContext("2d") || null;
let ctxGrid = canvasGrid?.getContext("2d") || null;

// Desktop
if (canvas) {
  canvas.addEventListener("mousemove", (e: MouseEvent) => {
    draw(
      e,
      session,
      ctx,
      color,
      socket,
      tool,
      pos,
      brushThickness,
      loginModal,
      logoutButton,
      logs
    );
  });
  canvas.addEventListener("mousedown", (e: MouseEvent) => {
    draw(
      e,
      session,
      ctx,
      color,
      socket,
      tool,
      pos,
      brushThickness,
      loginModal,
      logoutButton,
      logs
    );
  });
  canvas.addEventListener("mouseenter", (e: MouseEvent) => {
    setPosition(e, pos, socket);
  });
  // Mobile
  canvas.addEventListener("touchmove", (e: TouchEvent) => {
    draw(
      e,
      session,
      ctx,
      color,
      socket,
      tool,
      pos,
      brushThickness,
      loginModal,
      logoutButton,
      logs
    );
  });
  canvas.addEventListener("touchend", (e: TouchEvent) => {
    setPosition(e, pos, socket);
  });
  canvas.addEventListener("touchstart", (e: TouchEvent) => {
    draw(
      e,
      session,
      ctx,
      color,
      socket,
      tool,
      pos,
      brushThickness,
      loginModal,
      logoutButton,
      logs
    );
  });
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
      initInput(input, value, brushThickness, color.l, color.s);

      input.addEventListener("input", () =>
        editColor(input, value, color, brushThickness, root)
      );
    }
  }
});

eraserButton?.addEventListener("click", () => {
  tool = "ERASER";
  eraserButton.classList.toggle("active");
  brushButton?.classList.toggle("active");
});

brushButton?.addEventListener("click", () => {
  tool = "BRUSH";
  eraserButton?.classList.toggle("active");
  brushButton.classList.toggle("active");
});

document.querySelector("#save")?.addEventListener("click", () => {
  const link = document.createElement("a");

  link.download = "sketch.png";
  link.href = canvas?.toDataURL() ?? "";
  link.click();
  link.remove();
});

// add window event listener to trigger when window is resized
window.addEventListener("resize", resize);
function resize() {
  if (canvas && ctx && canvasGrid) {
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
}

// Init size
currentWindowWidth = window.innerWidth;

if (canvas && canvasGrid && ctxGrid) {
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

  const modalButtons: NodeListOf<HTMLButtonElement> =
    document.querySelectorAll("button[data-modal]");
  modalButtons.forEach((button) => {
    const modal: HTMLDialogElement | null = document.querySelector(
      `#${button.dataset.modal}`
    );

    if (modal) {
      const closeModalButton = modal.querySelector("button[autofocus]");
      console.log(modal);

      button.addEventListener("click", () => {
        modal.showModal();
      });
      closeModalButton?.addEventListener("click", () => {
        modal.close();
      });
    }
  });
}
