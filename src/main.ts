import { io } from "socket.io-client";
import {
  createLog,
  displayConnectedUsers,
  draw,
  drawEllipse,
  drawGridCanavas,
  editColor,
  initInput,
  isErrorWithMessage,
  logOutUser,
  setColor,
  setPosition,
} from "./helpers";
import "./style.scss";
import type { Color, Shape, Tool, TwitchResponseUser, User } from "./types";
import type { Socket } from "socket.io-client";

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
const root = document.documentElement;


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
 * SESSION DOM
 */
const logs: HTMLUListElement | null = document.querySelector("#logs-list");
const online: HTMLUListElement | null = document.querySelector("#online-users");
const loginModal: HTMLDialogElement | null = document.querySelector("#login");
const logoutButton: HTMLButtonElement | null =
  document.querySelector("#logout");
const loginError: HTMLParagraphElement | null =
  document.querySelector("#login-error");

// Logout event listener
logoutButton?.addEventListener("click", () =>
  logOutUser(loginModal, logoutButton, session, socket)
);

// Login
const emitUserLogged = (
  u: User | null,
  socket: Socket,
  root: HTMLElement | null,
  logs: HTMLUListElement | null,
  connectedUsers: User[],
  online: HTMLUListElement | null
) => {
  if (u) {
    socket.emit(
      "userLogged",
      u,
      (response: { ok: boolean; user: User; connected: User[] }) => {
        if (response.ok && root) {
          if ((u === null || response.user.id !== u.id) && logs) {
            logs.insertBefore(
              createLog(response.user, "Connexion"),
              logs.children[0]
            );
          } else {
            session = response.user;

            setColor(response.user.color, root, true);
          }

          connectedUsers = response.connected;
          displayConnectedUsers(connectedUsers, online);
        }
      }
    );
  }
};

// Twitch auth
const access_token = new URLSearchParams(
  document.location.hash.replace("#", "")
).get("access_token");

if (access_token) {
  try {
    const res = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Client-Id": "bogukfbk1bpf9tgex1zan5xsew7nlj",
      },
    });
    if (!res.ok || res.status !== 200) {
      throw new Error("Login to Twitch failed");
    }

    const resData = await res.json();

    const twitchData = resData.data;

    if (twitchData.length > 0) {
      const twitchUser: TwitchResponseUser = twitchData[0];

      const { display_name: username, id } = twitchUser;

      const newColor: Color = {
        l: 50,
        s: 50,
        h: Math.random() * 360,
      };

      const newUser = {
        username,
        id,
        color: newColor,
      };

      if (loginModal && logoutButton) {
        // Hide login modal
        loginModal.close();
        logoutButton.style.display = "inline-block";
      }

      // Socket IO
      emitUserLogged(newUser, socket, root, logs, connectedUsers, online);
    }
  } catch (error) {
    if (loginModal && logoutButton && loginError) {
      loginModal.showModal();
      logoutButton.style.display = "none";

      const errorMessage: string = isErrorWithMessage(error)
        ? error.message
        : String(error);

      // Display error message
      loginError.innerHTML = errorMessage;
    }

    console.error(error);
  }
} else {
  if (loginModal && logoutButton) {
    loginModal.showModal();
    logoutButton.style.display = "none";
  }

  const newColor: Color = {
    l: 50,
    s: 50,
    h: Math.random() * 360,
  };

  setColor(newColor, root, true);
}

// log out user
socket.on("userLogout", (user: User, connected: User[]) => {
  if ((session === null || user.id !== (session as User).id) && logs)
    logs.insertBefore(createLog(user, "Déconnexion"), logs.children[0]);

  connectedUsers = connected;
  displayConnectedUsers(connectedUsers, online);
});

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
    if (input && session) {
      const value = submenu.querySelector("span");
      const { color } = session as User;
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

    button.addEventListener("click", () => {
      modal.showModal();
    });
    closeModalButton?.addEventListener("click", () => {
      modal.close();
    });
  }
});
