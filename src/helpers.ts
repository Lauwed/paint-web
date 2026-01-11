import type { Color, Position, Shape, Tool, User } from "./types";

export const emitUserLogged = (s: User | null, socket: any) =>
  socket.emit("userLogged", s);
export const emitUserLogout = (s: User | null, socket: any) =>
  socket.emit("userLogout", s);

export let getColor = (h: number, s: number, l: number) =>
  "hsl(" + h + " " + s + "% " + l + "%)";

export const getUserHTML = (user: User) => {
  return `
          <li class="online__user" data-id="${user.id}">
            <span class="online__user__color" style="background-color: ${getColor(
              user.hue,
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
  logs: HTMLUListElement | null,
  session: User | null,
  socket: any
) => {
  window.localStorage.removeItem("devgirlpaint");

  // Display login form
  loginModal?.showModal();
  if (logoutButton) {
    logoutButton.style.display = "none";
  }

  // Log connected
  if (logs) {
    logs.innerHTML += `<li>Bye bye, à bientôt !</li>`;
  }

  // Socket IO
  emitUserLogout(session, socket);

  // Null session
  session = null;
};

export function drawEllipse(
  ellipse: Shape,
  session: User | null,
  context: CanvasRenderingContext2D | null
) {
  if ((session === null || ellipse.id !== session.id) && context) {
    context.beginPath(); // begin the drawing path
    context.fillStyle = ellipse.color;
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
  socket: any
) {
  let rect = (e.target as HTMLElement).getBoundingClientRect();

  const x = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
  const y = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

  pos.x = Math.floor(x - rect.x);
  pos.y = Math.floor(y - rect.y);

  socket.emit("mousemove", { x: pos.x, y: pos.y });
}

export function draw(
  e: MouseEvent | TouchEvent,
  session: User | null,
  context: CanvasRenderingContext2D | null,
  color: Color,
  socket: any,
  tool: Tool,
  pos: Position,
  brushThickness: number,
  loginModal: HTMLDialogElement | null,
  logoutButton: HTMLButtonElement | null,
  logs: HTMLUListElement | null
) {
  e.preventDefault();

  if (!session || !context) return;

  // if mouse is not clicked, do not go further
  if (e instanceof MouseEvent && e.buttons !== 1) return;

  context.beginPath(); // begin the drawing path
  context.fillStyle = getColor(color.h, color.s, color.l); // hex color of line
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
      color: getColor(color.h, color.s, color.l),
      x: pos.x,
      y: pos.y,
      size: brushThickness,
    },
    (response: { ok: boolean }) => {
      if (!response.ok) {
        logOutUser(loginModal, logoutButton, logs, session, socket);
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
): { color: Color; brushThickness: number } => {
  if (input && value) {
    value.innerHTML = input.value;

    if (input.name === "saturation") color.s = parseInt(input.value);
    else if (input.name === "luminosity") color.l = parseInt(input.value);
    else if (input.name === "size") brushThickness = parseInt(input.value);

    setColor(color, root);
  }

  return {
    color,
    brushThickness,
  };
};
