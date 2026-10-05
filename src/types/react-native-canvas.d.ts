declare module 'react-native-canvas' {
  import { Component } from 'react';
  import { StyleProp, ViewStyle } from 'react-native';

  export class Image {
    constructor(canvas: Canvas, height?: number, width?: number);
    src: string;
    width: number;
    height: number;
    addEventListener(event: 'load' | 'error', listener: () => void): void;
  }

  export class ImageData {
    constructor(canvas: Canvas, data: number[], width: number, height?: number);
    data: number[];
    width: number;
    height: number;
  }

  export class Path2D {
    constructor(canvas: Canvas, path?: string);
  }

  interface CanvasRenderingContext2D {
    fillStyle: string;
    strokeStyle: string;
    lineWidth: number;
    font: string;
    globalAlpha: number;
    textAlign: string;
    textBaseline: string;
    fillRect(x: number, y: number, w: number, h: number): void;
    strokeRect(x: number, y: number, w: number, h: number): void;
    clearRect(x: number, y: number, w: number, h: number): void;
    fillText(text: string, x: number, y: number, maxWidth?: number): void;
    strokeText(text: string, x: number, y: number, maxWidth?: number): void;
    beginPath(): void;
    closePath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
    bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
    arc(x: number, y: number, r: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void;
    rect(x: number, y: number, w: number, h: number): void;
    fill(): void;
    stroke(): void;
    drawImage(image: Image, dx: number, dy: number, dw?: number, dh?: number): void;
    save(): void;
    restore(): void;
    scale(x: number, y: number): void;
    rotate(angle: number): void;
    translate(x: number, y: number): void;
    createLinearGradient(x0: number, y0: number, x1: number, y1: number): any;
    roundRect?(x: number, y: number, w: number, h: number, radii: number): void;
  }

  interface CanvasProps {
    style?: StyleProp<ViewStyle>;
    baseUrl?: string;
    originWhitelist?: string[];
  }

  class Canvas extends Component<CanvasProps> {
    width: number;
    height: number;
    getContext(contextType: '2d'): CanvasRenderingContext2D;
    toDataURL(): Promise<string>;
  }

  export default Canvas;
}
