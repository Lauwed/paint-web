import type { Socket } from "socket.io-client";
import type { Color, Position, Stroke, Tool, User } from "./types";

// THROTTLING and STROKE DATAS
let lastPoint: Position | null = null;
let lastSentPoint: Position | null = null;
let lastSendTime = 0;
const SEND_INTERVAL = 20; // 20ms

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

// Draw stroke instead point
export function drawLine(
  context: CanvasRenderingContext2D,
  from: Position,
  to: Position,
  color: string,
  size: number,
  tool: Tool
) {
  context.beginPath();
  context.strokeStyle = color;
  context.lineWidth = size;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (tool === "BRUSH") {
    context.globalCompositeOperation = "source-over";
  } else if (tool === "ERASER") {
    context.globalCompositeOperation = "destination-out";
  }

  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
}

// Draw stroke fort socket
export function drawStroke(
  stroke: Stroke,
  session: User | null,
  context: CanvasRenderingContext2D | null
) {
  if (!context || (session && stroke.id === session.id)) return;

  drawLine(
    context,
    stroke.from,
    stroke.to,
    stroke.color,
    stroke.size,
    stroke.tool ?? "BRUSH"
  );
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

// New draw function (for strokes)
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

  // If not clicked, reset lastPoint and stop
  if (e instanceof MouseEvent && e.buttons !== 1) {
    lastPoint = null;
    return;
  }

  const previousPoint: Position | null = lastPoint
    ? { x: lastPoint.x, y: lastPoint.y }
    : null;

  setPosition(e, pos, socket);

  const colorString = getColor(session.color.h, session.color.s, session.color.l);

  // Draw locally
  if (previousPoint) {
    drawLine(context, previousPoint, pos, colorString, brushThickness, tool);
  } else {
    context.beginPath();
    context.fillStyle = colorString;
    if (tool === "BRUSH") {
      context.globalCompositeOperation = "source-over";
    } else if (tool === "ERASER") {
      context.globalCompositeOperation = "destination-out";
    }
    context.arc(pos.x, pos.y, brushThickness / 2, 0, Math.PI * 2);
    context.fill();
  }

  // Send to server every SEND_INTERVAL ms
  const now = Date.now();
  const currentPos = { x: pos.x, y: pos.y };

  if (lastSentPoint && now - lastSendTime >= SEND_INTERVAL) {
    socket.emit(
      "draw",
      {
        id: session.id,
        color: colorString,
        from: lastSentPoint,
        to: currentPos,
        size: brushThickness,
        tool,
      },
      (response: { ok: boolean; id: string }) => {
        if (!response.ok && response.id === session.id) {
          logOutUser(loginModal, logoutButton, session, socket);
        }
      }
    );
    lastSendTime = now;
    lastSentPoint = currentPos;
  } else if (!lastSentPoint) {
    lastSentPoint = currentPos;
  }

  // Update lastPoint
  lastPoint = currentPos;
}

export function resetDrawState() {
  lastPoint = null;
  lastSentPoint = null;
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
