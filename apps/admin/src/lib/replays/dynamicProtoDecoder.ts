// src/lib/replays/dynamicProtoDecoder.ts - Purpose: compile pasted proto schema text and decode replay protobuf payloads dynamically.
import protobuf from "protobufjs";

export interface DynamicProtoDecoder {
  decode: (messageTypeName: string, payload: Uint8Array) => unknown;
}

function sanitizeValue(value: unknown, depth: number = 0): unknown {
  if (depth > 3) {
    return "[truncated-depth]";
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return value.length > 300 ? `${value.slice(0, 300)}...(truncated)` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    const limited = value.slice(0, 30).map((entry) => sanitizeValue(entry, depth + 1));
    if (value.length > 30) {
      limited.push(`...(${value.length - 30} more items)`);
    }
    return limited;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 40);
    for (const [key, entry] of entries) {
      out[key] = sanitizeValue(entry, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function createDynamicProtoDecoder(protoSchemaText: string): DynamicProtoDecoder {
  const parsed = protobuf.parse(protoSchemaText, { keepCase: true });
  const root = parsed.root;

  return {
    decode(messageTypeName: string, payload: Uint8Array): unknown {
      const normalizedName = messageTypeName.startsWith(".")
        ? messageTypeName
        : `.${messageTypeName}`;
      const found = root.lookupType(normalizedName);
      if (!found) {
        throw new Error(`Message type not found in pasted schema: ${messageTypeName}`);
      }

      const decoded = found.decode(payload);
      const plain = found.toObject(decoded, {
        longs: String,
        enums: String,
        bytes: String,
        defaults: false,
      });
      return sanitizeValue(plain);
    },
  };
}
