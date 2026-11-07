declare module 'mammoth' {
  export interface ImageElement {
    read(encoding: 'base64'): Promise<string>;
    contentType: string;
  }

  export interface ConvertResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export type ImageConverter = (image: ImageElement) => Promise<{ src: string }>;

  export interface Options {
    arrayBuffer?: ArrayBuffer;
    buffer?: Buffer;
    convertImage?: unknown;
    styleMap?: string[];
  }

  export const images: {
    imgElement(handler: ImageConverter): unknown;
  };

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer } | { buffer: Buffer },
    options?: Options,
  ): Promise<ConvertResult>;

  export function extractRawText(
    input: { arrayBuffer: ArrayBuffer } | { buffer: Buffer },
  ): Promise<ConvertResult>;
}
