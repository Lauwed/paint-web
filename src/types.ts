export interface User {
  username: string;
  color: Color;
  id: string;
}

export interface Stroke {
  id: string;
  color: string;
  from: Position;
  to: Position;
  size: number;
  tool?: Tool;
}

export interface Position {
  x: number;
  y: number;
}

export interface Color {
  h: number;
  s: number;
  l: number;
}

export type Tool = "BRUSH" | "ERASER";

export interface ServerToClientEvents {
  userLogged: (user: User, connected: User[]) => void;
  userLogout: (user: User, connected: User[]) => void;
  draw: (stroke: Stroke) => void;
}

export interface ClientToServerEvents {
  userLogged: (user: User) => void;
  userLogout: (user: User) => void;
  draw: (
    stroke: Stroke,
    callback: (response: { ok: boolean; id: string }) => void
  ) => void;
  disconnect: () => void;
  mousemove: (pos: Position) => void;
}

export interface TwitchResponseUser {
  display_name: string;
  id: string;
}
