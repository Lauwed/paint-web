export interface User {
  username: string;
  color: string;
  id: string;
  hue: number;
}

export interface Shape {
  id: string;
  color: string;
  x: number;
  y: number;
  size: number;
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
