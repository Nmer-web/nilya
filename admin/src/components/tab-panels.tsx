"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Panel = {
  value: string;
  label: string;
  count?: number;
  content: ReactNode;
};

/**
 * Thin client wrapper around the tab primitive. The panel contents are rendered
 * on the server and passed through as children, so this holds the selected-tab
 * state and nothing else.
 */
export function TabPanels({
  panels,
  defaultValue,
}: {
  panels: Panel[];
  defaultValue?: string;
}) {
  return (
    <Tabs defaultValue={defaultValue ?? panels[0]?.value}>
      <TabsList>
        {panels.map((panel) => (
          <TabsTrigger key={panel.value} value={panel.value}>
            {panel.label}
            {typeof panel.count === "number" ? (
              <span className="tabular ml-1.5 rounded-full bg-zinc-200/70 px-1.5 text-[11px] font-semibold text-zinc-700">
                {panel.count}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {panels.map((panel) => (
        <TabsContent key={panel.value} value={panel.value} className="mt-4">
          {panel.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
