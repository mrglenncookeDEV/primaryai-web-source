import type { LessonPackRequest } from "./types";

export function record(providerId: string, req: LessonPackRequest) {
  console.log("telemetry", providerId, req);
}
