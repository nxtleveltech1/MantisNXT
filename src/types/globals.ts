/**
 * Project-wide helper types for safer structural typing.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type Dict<T = unknown> = Record<string, T>;
export type StrDict = Record<string, string>;
export type UnknownRecord = Record<string, unknown>;

export type UUID = string & { readonly __uuid: unique symbol };
export type Milliseconds = number & { readonly __ms: unique symbol };

