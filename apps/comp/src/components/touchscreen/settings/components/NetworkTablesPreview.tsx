import { ntSelectedPathTopics } from "@/lib/settings";

export function NetworkTablesPreview({
  ntHost,
  previewTopics,
}: {
  ntHost: string;
  previewTopics: ReturnType<typeof ntSelectedPathTopics>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold tracking-[0.2em]">NT Preview</p>
      <div className="flex flex-col divide-y-2 divide-white/10 border-2 border-white/10">
        {[
          { label: "Host", value: ntHost || "(not set)" },
          { label: "Request topic", value: previewTopics.requestTopic },
          { label: "State topic", value: previewTopics.stateTopic },
          {
            label: "Robot constants",
            value: `${previewTopics.requestTopicWithoutLeadingSlash} / ${previewTopics.stateTopicWithoutLeadingSlash}`,
          },
        ].map((row) => (
          <div key={row.label} className="flex flex-col gap-1 px-5 py-4">
            <span className="text-xs text-zinc-500">{row.label}</span>
            <span className="break-all font-mono text-base text-zinc-100">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
