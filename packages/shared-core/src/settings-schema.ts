export interface NetworkTablesSettings {
  host: string;
  port: number;
  sharedTable: string;
  selectedPathTopic: string;
}

export interface ConnectionSettings {
  host: string;
  port: number;
  networkTables: NetworkTablesSettings;
}

export interface SharedSettingsPayload {
  version: number;
  updatedAtIso: string;
  settings: ConnectionSettings;
}

export const DEFAULTS: ConnectionSettings = {
  host: "10.47.65.7",
  port: 8080,
  networkTables: {
    host: "10.47.65.2",
    port: 5810,
    sharedTable: "PathPlanner",
    selectedPathTopic: "SelectedPath",
  },
};

export function frcTeamToRobotIp(teamNumber: number, lastOctet = 2): string {
  const team = Math.max(0, Math.floor(teamNumber));
  const octet = Math.min(254, Math.max(1, Math.floor(lastOctet)));
  const upper = Math.floor(team / 100);
  const lower = team % 100;
  return `10.${upper}.${lower}.${octet}`;
}

export function ntPathFromTableAndEntry(table: string, entry: string): string {
  const normalizedTable = table.trim().replace(/^\/+|\/+$/g, "");
  const normalizedEntry = entry.trim().replace(/^\/+|\/+$/g, "");
  return `/${normalizedTable}/${normalizedEntry}`;
}

export function ntSelectedPathTopics(
  table: string,
  selectedPathTopic: string,
): {
  requestTopic: string;
  stateTopic: string;
  requestTopicWithoutLeadingSlash: string;
  stateTopicWithoutLeadingSlash: string;
} {
  const basePath = ntPathFromTableAndEntry(table, selectedPathTopic);
  const basePathWithoutLeadingSlash = basePath.replace(/^\/+/, "");

  return {
    requestTopic: `${basePath}/Request`,
    stateTopic: `${basePath}/State`,
    requestTopicWithoutLeadingSlash: `${basePathWithoutLeadingSlash}/Request`,
    stateTopicWithoutLeadingSlash: `${basePathWithoutLeadingSlash}/State`,
  };
}
