import { slugify, titleCase } from "./lib/helpers/strings";
import { addDays, toISODate } from "./lib/helpers/dates";
import { chunk, groupBy } from "./lib/helpers/arrays";
import * as helpers from "./lib/helpers";

export function demo(): string {
  const tomorrow = addDays(new Date(), 1);
  const groups = groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? "even" : "odd"));
  const slug = slugify(titleCase("hello world"));
  const pages = chunk([1, 2, 3, 4, 5], 2);
  return `${slug} ${toISODate(tomorrow)} ${JSON.stringify(groups)} ${pages.length} ${helpers.compact([0, 1, null, 2]).length}`;
}
