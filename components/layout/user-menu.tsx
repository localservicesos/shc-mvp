import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserMenu({ email }: { email: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{email}</p>
        <p className="text-xs text-muted-foreground">Signed in</p>
      </div>
      <form action="/auth/signout" method="post">
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
