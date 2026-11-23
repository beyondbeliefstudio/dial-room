/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as calls from "../calls.js";
import type * as crons from "../crons.js";
import type * as importer from "../importer.js";
import type * as lib from "../lib.js";
import type * as meetings from "../meetings.js";
import type * as prospects from "../prospects.js";
import type * as queue from "../queue.js";
import type * as reviews from "../reviews.js";
import type * as scripts from "../scripts.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  calls: typeof calls;
  crons: typeof crons;
  importer: typeof importer;
  lib: typeof lib;
  meetings: typeof meetings;
  prospects: typeof prospects;
  queue: typeof queue;
  reviews: typeof reviews;
  scripts: typeof scripts;
  settings: typeof settings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
