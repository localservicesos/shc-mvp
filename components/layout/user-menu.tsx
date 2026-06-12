import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function UserMenu({ email }: { email: string }) {
  return (
    // The narrow tablet sidebar can't fit email + buttons side by side, so
    // the row stacks at md and goes back to a single row at lg.
    <div className="flex items-center justify-between gap-2 border-t p-4 md:flex-col md:items-stretch xl:flex-row xl:items-center">
      <div className="min-w-0 flex-1">
        <p className="break-all text-xs font-medium md:text-[11px]">{email}</p>
        <p className="text-xs text-muted-foreground">Signed in</p>
      </div>
      <div className="flex items-center justify-between gap-1 xl:justify-end">
        {/* On tablet widths the floating toggle is hidden (its reserved right
            padding cramped the content), so it lives here instead. */}
        <div className="hidden md:block xl:hidden">
          <ThemeToggle />
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
    </div>
  );
}
