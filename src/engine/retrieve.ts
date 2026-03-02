import { searchObjectives } from "./vectorSearch";

export async function retrieveObjectives(year_group: string, subject: string, topic: string) {
  return searchObjectives(year_group, subject, topic, 5);
}
