import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getSetting, saveSetting } from "@/lib/settings.functions";

export function useSetting<T extends Record<string, unknown>>(key: string, defaults: T) {
  const [value, setValue] = useState<T>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getSetting({ data: { key } })
      .then((r) => {
        if (!alive) return;
        const v = (r.value && typeof r.value === "object" && !Array.isArray(r.value)) ? r.value as Record<string, unknown> : {};
        setValue({ ...defaults, ...v } as T);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const save = useCallback(async (next?: T) => {
    const v = next ?? value;
    setSaving(true);
    try {
      await saveSetting({ data: { key, value: v as never } });
      toast.success("Saved");
      if (next) setValue(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [key, value]);

  return { value, setValue, save, loading, saving };
}