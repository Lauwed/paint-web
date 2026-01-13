import type { Socket } from "socket.io-client";
import type { Color, Position, Shape, Tool, User } from "./types";

export const emitUserLogout = (u: User | null, socket: Socket) => {
  if (u) socket.emit("userLogout", u);
};

export const getColor = (h: number, s: number, l: number) =>
  "hsl(" + h + " " + s + "% " + l + "%)";

export const getUserHTML = (user: User) => {
  return `
    <li class="online__user" data-id="${user.id}">
      <span class="online__user__color" style="background-color: ${getColor(
        user.color.h,
        50,
        50
      )}"></span>
      <span class="online__user__name">${user.username}</span>  
    </li>
  `;
};

export const displayConnectedUsers = (
  connectedUsers: User[],
  listNode: Element | null
) => {
  if (connectedUsers && listNode) {
    let connectedUsersHTML = "";
    connectedUsers.forEach((u) => (connectedUsersHTML += getUserHTML(u)));
    listNode.innerHTML = connectedUsersHTML;
  }
};

export const logOutUser = (
  loginModal: HTMLDialogElement | null,
  logoutButton: HTMLButtonElement | null,
  session: User | null,
  socket: Socket
) => {
  window.localStorage.removeItem("devgirlpaint");

  // Display login form
  loginModal?.showModal();
  if (logoutButton) {
    logoutButton.style.display = "none";
  }

  // Socket IO
  emitUserLogout(session, socket);

  // Null session
  session = null;
};

export const createLog = (user: User, action: string) => {
  const logRow = document.createElement("tr");

  [new Date().toISOString(), user.username, action].forEach(
    (v: string | number) => {
      const logCell = document.createElement("td");
      logCell.innerHTML = String(v);

      logRow.appendChild(logCell);
    }
  );

  return logRow;
};

export function drawEllipse(
  ellipse: Shape,
  session: User | null,
  context: CanvasRenderingContext2D | null
) {
  if ((session === null || ellipse.id !== session.id) && context) {
    context.beginPath(); // begin the drawing path

    context.fillStyle = ellipse.color;

    if (ellipse.tool === "BRUSH") {
      context.globalCompositeOperation = "source-over";
    } else if (ellipse.tool === "ERASER") {
      context.globalCompositeOperation = "destination-out";
    }

    context.fillRect(
      ellipse.x - ellipse.size / 2,
      ellipse.y - ellipse.size / 2,
      ellipse.size,
      ellipse.size
    );
  }
}

export const setColor = (
  color: Color,
  documentRoot: HTMLElement,
  init = false
) => {
  if (init)
    documentRoot.style.setProperty(
      "--base-color",
      getColor(color.h, color.s, color.l)
    );
  documentRoot.style.setProperty(
    "--color",
    getColor(color.h, color.s, color.l)
  );
};

export function setPosition(
  e: MouseEvent | TouchEvent,
  pos: Position,
  socket: Socket
) {
  const rect = (e.target as HTMLElement).getBoundingClientRect();
  const wRatio =
    (e.target as HTMLCanvasElement).width /
    (e.target as HTMLCanvasElement).clientWidth;
  const hRatio =
    (e.target as HTMLCanvasElement).height /
    (e.target as HTMLCanvasElement).clientHeight;

  const x = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
  const y = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

  pos.x = Math.floor((x - rect.x) * wRatio);
  pos.y = Math.floor((y - rect.y) * hRatio);

  socket.emit("mousemove", { x: pos.x, y: pos.y });
}

export const drawGridCanavas = (
  context: CanvasRenderingContext2D | null,
  canvas: HTMLCanvasElement | null
) => {
  if (context && canvas) {
    // draw a line every *step* pixels
    const step = 50;
    // set our styles
    context.save();
    context.strokeStyle = "gray"; // line colors
    context.lineWidth = 0.35;

    // draw vertical from X to Height
    for (let x = 0; x < canvas.clientWidth; x += step) {
      // draw vertical line
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.clientWidth);
      context.stroke();
    }

    // draw horizontal from Y to Width
    for (let y = 0; y < canvas.clientHeight; y += step) {
      // draw horizontal line
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.clientHeight, y);
      context.stroke();
    }

    // restore the styles from before this function was called
    context.restore();
  }
};

export function draw(
  e: MouseEvent | TouchEvent,
  session: User | null,
  context: CanvasRenderingContext2D | null,
  socket: Socket,
  tool: Tool,
  pos: Position,
  brushThickness: number,
  loginModal: HTMLDialogElement | null,
  logoutButton: HTMLButtonElement | null
) {
  e.preventDefault();

  if (!session || !context) return;

  // if mouse is not clicked, do not go further
  if (e instanceof MouseEvent && e.buttons !== 1) return;

  context.beginPath(); // begin the drawing path
  context.fillStyle = getColor(
    session.color.h,
    session.color.s,
    session.color.l
  ); // hex color of line
  if (tool === "BRUSH") {
    context.globalCompositeOperation = "source-over";
  } else if (tool === "ERASER") {
    context.globalCompositeOperation = "destination-out";
  }
  setPosition(e, pos, socket);

  context.fillRect(
    pos.x - brushThickness / 2,
    pos.y - brushThickness / 2,
    brushThickness,
    brushThickness
  );

  socket.emit(
    "draw",
    {
      id: session.id,
      color: getColor(session.color.h, session.color.s, session.color.l),
      x: pos.x,
      y: pos.y,
      size: brushThickness,
      tool,
    },
    (response: { ok: boolean; id: string }) => {
      if (!response.ok && response.id === session.id) {
        logOutUser(loginModal, logoutButton, session, socket);
      }
    }
  );
}

export function initInput(
  input: HTMLInputElement | null,
  value: HTMLSpanElement | null,
  size: number,
  s: number,
  l: number
) {
  if (input && value) {
    if (input.name === "saturation") input.value = String(s);
    else if (input.name === "luminosity") input.value = String(l);
    else if (input.name === "size") input.value = String(size);
    value.innerHTML = input.value;
  }
}

export const editColor = (
  input: HTMLInputElement | null,
  value: HTMLSpanElement | null,
  color: Color,
  brushThickness: number,
  root: HTMLElement
): { color: Color; thickness: number } => {
  if (input && value) {
    value.innerHTML = input.value;

    if (input.name === "saturation") color.s = parseInt(input.value);
    else if (input.name === "luminosity") color.l = parseInt(input.value);
    else if (input.name === "size") brushThickness = parseInt(input.value);

    setColor(color, root);
  }

  return {
    color,
    thickness: brushThickness,
  };
};

export const isErrorWithMessage = (
  error: unknown
): error is { message: string } => {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, string>).message === "string"
  );
};
