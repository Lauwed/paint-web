import {
  createLog,
  displayConnectedUsers,
  draw,
  drawEllipse,
  drawGridCanavas,
  editColor,
  emitUserLogged,
  getColor,
  initInput,
  logOutUser,
  setColor,
  setPosition,
} from "./helpers";
import "./style.scss";
import type { Color, Shape, Tool, User } from "./types";
import { io } from "socket.io-client";

// SOURCE : https://github.com/AnshikaG0219/web-paint-final

// TODO
// - Le scroll sur canvas
// - Le footer
// - Le menu en mode Easter egg
// - limit to brush size

const socket = io();
let connectedUsers: User[] = [];

let session: User | null = null;
let currentWindowWidth: number;

const canvasSize = 2048;

// Log in user
socket.on("userLogged", (user: User, connected: User[]) => {
  if ((session === null || user.id !== session.id) && logs) {
    logs.insertBefore(createLog(user, "Connexion"), logs.children[0]);
  } else {
    session = user;
  }

  connectedUsers = connected;
  displayConnectedUsers(connectedUsers, online);
});
// log out user
socket.on("userLogout", (user: User, connected: User[]) => {
  if ((session === null || user.id !== session.id) && logs)
    logs.insertBefore(createLog(user, "Déconnexion"), logs.children[0]);

  connectedUsers = connected;
  displayConnectedUsers(connectedUsers, online);
});
// Error login
socket.on("errorBadUsername", () => {
  if (errorUsername)
    errorUsername.innerHTML = "Mauvais nom d'utilisateur.ice (:";
});
socket.on("imageData", ({ src }) => {
  if (ctx) {
    const img = new Image();
    img.src = src;
    img.onload = function () {
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, 0, 0);
    };
  }
});

socket.on("draw", (ellipse: Shape) => drawEllipse(ellipse, session, ctx));

/**
 * USER COLOR
 */
const root = document.documentElement;

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
        const username = usernameInput?.value.replaceAll("\\p{C}", "").trim();

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

          // Socket IO
          emitUserLogged(session, socket);
        } else {
          // TODO: Display error
        }
      });
  }
}
// Logout event listener
logoutButton?.addEventListener("click", () =>
  logOutUser(loginModal, logoutButton, session, socket)
);

/**
 * CANVAS
 */
let brushThickness = 7;
const pos = { x: 0, y: 0 };
let tool: Tool = "BRUSH";
const eraserButton = document.querySelector("#eraser");
const brushButton = document.querySelector("#brush");

// Canvas
const canvas: HTMLCanvasElement | null = document.querySelector("#canvas");
const canvasGrid: HTMLCanvasElement | null =
  document.querySelector("#canvas-grid");
const ctx = canvas?.getContext("2d") || null;
const ctxGrid = canvasGrid?.getContext("2d") || null;
const canvasContainer: HTMLElement | null =
  document.getElementById("canvas-container");

if (canvas) {
  const events = ["mousemove", "mousedown", "touchstart", "touchmove"] as const;

  events.forEach((event) => {
    canvas.addEventListener(event, (e: MouseEvent | TouchEvent) => {
      if (e instanceof MouseEvent && e.ctrlKey) {
        return;
      }
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
        logoutButton
      );
    });
  });

  canvas.addEventListener("mouseenter", (e: MouseEvent) => {
    setPosition(e, pos, socket);
  });
  canvas.addEventListener("touchend", (e: TouchEvent) => {
    setPosition(e, pos, socket);
  });
}

if (canvasContainer && canvas && canvasGrid) {
  let isCtrlPanning = false;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let startScrollTop = 0;

  canvasContainer.addEventListener("mousedown", (e) => {
    if (!e.ctrlKey) return;

    isCtrlPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    startScrollLeft = canvasContainer.scrollLeft;
    startScrollTop = canvasContainer.scrollTop;

    canvas.classList.add("active");

    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isCtrlPanning) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    canvasContainer.scrollLeft = startScrollLeft - dx;
    canvasContainer.scrollTop = startScrollTop - dy;
  });

  window.addEventListener("mouseup", () => {
    isCtrlPanning = false;
    canvas.classList.remove("active");
  });
  let scale = 1;

  canvasContainer.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey) return;

      e.preventDefault();

      const zoom = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(4, Math.max(0.25, scale * zoom));
      if (newScale === scale) return;

      const rect = canvasContainer.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + canvasContainer.scrollLeft;
      const mouseY = e.clientY - rect.top + canvasContainer.scrollTop;

      const worldX = mouseX / scale;
      const worldY = mouseY / scale;

      scale = newScale;
      canvas.style.width = `${scale * canvas.width}px`;
      canvasGrid.style.width = `${scale * canvasGrid.width}px`;

      canvasContainer.scrollLeft = worldX * scale - (e.clientX - rect.left);
      canvasContainer.scrollTop = worldY * scale - (e.clientY - rect.top);
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    if (e.key === "Control") canvas.classList.add("ctrl-pan");
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "Control") canvas.classList.remove("ctrl-pan");
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

      input.addEventListener("input", () => {
        const { thickness } = editColor(
          input,
          value,
          color,
          brushThickness,
          root
        );

        brushThickness = thickness;
      });
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
    const data = ctx.getImageData(0, 0, currentWindowWidth, currentWindowWidth);
    canvas.width = canvasSize;
    canvasGrid.width = canvasSize;

    canvas.height = canvasSize;
    canvasGrid.height = canvasSize;

    drawGridCanavas(ctxGrid, canvas);

    if (data) ctx.putImageData(data, 0, 0);

    currentWindowWidth = window.innerWidth;
  }
}

// Init size
currentWindowWidth = window.innerWidth;

if (canvas && canvasGrid && ctxGrid) {
  canvas.width = canvasSize;
  canvasGrid.width = canvasSize;

  canvas.height = canvasSize;
  canvasGrid.height = canvasSize;

  drawGridCanavas(ctxGrid, canvas);
}

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
