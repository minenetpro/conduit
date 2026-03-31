"use client";

import * as React from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

const useDialogContext = () => {
  const context = React.useContext(DialogContext);

  if (!context) {
    throw new Error("Dialog components must be wrapped in <Dialog />.");
  }

  return context;
};

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

type DialogTriggerProps = {
  asChild?: boolean;
  children: React.ReactNode;
};

function DialogTrigger({ asChild, children }: DialogTriggerProps) {
  const { onOpenChange } = useDialogContext();

  if (asChild && React.isValidElement(children)) {
    const element = children as React.ReactElement<{
      onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    }>;

    return React.cloneElement(element, {
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        element.props.onClick?.(event);
        if (!event.defaultPrevented) {
          onOpenChange(true);
        }
      },
    });
  }

  return (
    <button type="button" onClick={() => onOpenChange(true)}>
      {children}
    </button>
  );
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(children, document.body);
}

function DialogContent({
  className,
  children,
}: React.ComponentProps<"div">) {
  const { open, onOpenChange } = useDialogContext();

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  return (
    <DialogPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute inset-0 bg-white/80 backdrop-blur-[2px]"
          onClick={() => onOpenChange(false)}
        />

        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative z-10 w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-6 shadow-lg",
            className,
          )}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
          {children}
        </div>
      </div>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-1.5 pr-8", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-lg font-semibold tracking-tight text-zinc-950", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return <p className={cn("text-sm leading-6 text-zinc-500", className)} {...props} />;
}

type DialogCloseProps = {
  asChild?: boolean;
  children: React.ReactNode;
};

function DialogClose({ asChild, children }: DialogCloseProps) {
  const { onOpenChange } = useDialogContext();

  if (asChild && React.isValidElement(children)) {
    const element = children as React.ReactElement<{
      onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    }>;

    return React.cloneElement(element, {
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        element.props.onClick?.(event);
        if (!event.defaultPrevented) {
          onOpenChange(false);
        }
      },
    });
  }

  return (
    <button type="button" onClick={() => onOpenChange(false)}>
      {children}
    </button>
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
