export interface AutoPathEntry {
  fileName: string;
  name: string;
}

export interface AutoPathMetadata {
  name?: string;
  description?: string;
  preview?: string;
}

export type PathsMetadataMap = Record<string, AutoPathMetadata>;
