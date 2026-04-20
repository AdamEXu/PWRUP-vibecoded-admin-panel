/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@bufbuild/protobuf/wire" {
  export class BinaryReader {
    constructor(...args: any[]);
    [key: string]: any;
  }

  export class BinaryWriter {
    constructor(...args: any[]);
    [key: string]: any;
  }

  export const WireType: any;
}
