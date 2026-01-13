export interface User {
  username: string;
  color: Color;
  id: string;
}

export interface Shape {
  id: string;
  color: string;
  x: number;
  y: number;
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
  draw: (ellipse: Shape) => void;
}

export interface ClientToServerEvents {
  userLogged: (user: User) => void;
  userLogout: (user: User) => void;
  draw: (
    ellipse: Shape,
    callback: (response: { ok: boolean; id: string }) => void
  ) => void;
  disconnect: () => void;
  mousemove: (pos: Position) => void;
}

export interface TwitchResponseUser {
  display_name: string;
  id: string;
}
