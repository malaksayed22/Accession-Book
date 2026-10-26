"use client";

import { createContext, useContext } from "react";

type ShellState = { isAdmin: boolean };

const ShellContext = createContext<ShellState>({ isAdmin: false });

/** What the signed-in frame knows about the viewer, for navigation that sits inside a page layout. */
export const ShellProvider = ShellContext.Provider;

export function useShell(): ShellState {
  return useContext(ShellContext);
}
