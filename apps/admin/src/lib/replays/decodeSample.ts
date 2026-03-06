// src/lib/replays/decodeSample.ts - Purpose: decode replay samples using pasted proto schema and per-topic message mappings.
import { createDynamicProtoDecoder } from "@/lib/replays/dynamicProtoDecoder";
import {
  type ReplaySummarySample,
  type ReplayTopicSchemaMap,
} from "@/lib/replays/shared";

interface DecoderLike {
  decode: (messageTypeName: string, payload: Uint8Array) => unknown;
}

export function decodeReplaySample(
  sample: ReplaySummarySample,
  topicSchemas: ReplayTopicSchemaMap,
  decoder: DecoderLike | null,
): ReplaySummarySample {
  const schemaId = topicSchemas[sample.topic];
  const base: ReplaySummarySample = { ...sample };
  const rawDataBase64 = sample.rawDataBase64;
  delete base.rawDataBase64;

  if (!schemaId || sample.dataType !== "protobuf" || !rawDataBase64) {
    return base;
  }

  try {
    base.schemaId = schemaId;
    if (!decoder) {
      base.decodeError =
        "No proto schema pasted. Paste a .proto schema and try again.";
      return base;
    }

    const payload = Uint8Array.from(Buffer.from(rawDataBase64, "base64"));
    base.decoded = decoder.decode(schemaId, payload);
    return base;
  } catch (error) {
    base.schemaId = schemaId;
    base.decodeError = (error as Error).message;
    return base;
  }
}

export function decodeReplaySamples(
  samples: ReplaySummarySample[],
  topicSchemas: ReplayTopicSchemaMap,
  protoSchemaText?: string,
): ReplaySummarySample[] {
  const decoder =
    protoSchemaText && protoSchemaText.trim().length > 0
      ? createDynamicProtoDecoder(protoSchemaText.trim())
      : null;
  return samples.map((sample) => decodeReplaySample(sample, topicSchemas, decoder));
}
