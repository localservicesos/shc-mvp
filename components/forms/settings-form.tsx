"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { isRedirectError } from "@/lib/utils/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type SettingsFormValues = {
  name: string;
  abn: string;
  email: string;
  phone: string;
  address: string;
};

const EMPTY: SettingsFormValues = {
  name: "",
  abn: "",
  email: "",
  phone: "",
  address: "",
};

type SettingsFormProps = {
  initial?: Partial<SettingsFormValues>;
  action: (formData: FormData) => Promise<void> | void;
};

export function SettingsForm({ initial, action }: SettingsFormProps) {
  const [values, setValues] = useState<SettingsFormValues>({
    ...EMPTY,
    ...initial,
  });
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof SettingsFormValues>(
    key: K,
    value: SettingsFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await action(formData);
      } catch (err) {
        // redirect() on success throws NEXT_REDIRECT — let Next navigate (the
        // success toast fires on the destination via FlashToast).
        if (isRedirectError(err)) throw err;
        toast.error(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      }
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Business name</Label>
        <Input
          id="name"
          name="name"
          required
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="abn">ABN</Label>
        <Input
          id="abn"
          name="abn"
          inputMode="numeric"
          placeholder="e.g. 12 345 678 901"
          value={values.abn}
          onChange={(e) => setField("abn", e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          name="address"
          rows={3}
          value={values.address}
          onChange={(e) => setField("address", e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
