"use client";

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "@/components/layout/theme-provider";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  const toasterPalette =
    theme === "dark"
      ? ({
          "--normal-bg": "rgba(30, 41, 59, 0.94)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "rgba(148, 163, 184, 0.18)",
          "--success-bg": "rgba(16, 185, 129, 0.16)",
          "--success-border": "rgba(52, 211, 153, 0.28)",
          "--success-text": "#a7f3d0",
          "--info-bg": "rgba(59, 130, 246, 0.18)",
          "--info-border": "rgba(96, 165, 250, 0.28)",
          "--info-text": "#bfdbfe",
          "--warning-bg": "rgba(245, 158, 11, 0.18)",
          "--warning-border": "rgba(251, 191, 36, 0.3)",
          "--warning-text": "#fde68a",
          "--error-bg": "rgba(239, 68, 68, 0.18)",
          "--error-border": "rgba(248, 113, 113, 0.28)",
          "--error-text": "#fecaca",
          "--border-radius": "calc(var(--radius) + 4px)",
          "--toast-shadow": "0 24px 60px -28px rgba(2, 6, 23, 0.72)",
        } as CSSProperties)
      : ({
          "--normal-bg": "rgba(255, 255, 255, 0.96)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "rgba(15, 23, 42, 0.08)",
          "--success-bg": "rgba(16, 185, 129, 0.1)",
          "--success-border": "rgba(16, 185, 129, 0.18)",
          "--success-text": "#047857",
          "--info-bg": "rgba(37, 99, 235, 0.1)",
          "--info-border": "rgba(37, 99, 235, 0.18)",
          "--info-text": "#1d4ed8",
          "--warning-bg": "rgba(245, 158, 11, 0.12)",
          "--warning-border": "rgba(245, 158, 11, 0.2)",
          "--warning-text": "#b45309",
          "--error-bg": "rgba(239, 68, 68, 0.1)",
          "--error-border": "rgba(239, 68, 68, 0.18)",
          "--error-text": "#b91c1c",
          "--border-radius": "calc(var(--radius) + 4px)",
          "--toast-shadow": "0 18px 45px -24px rgba(15, 23, 42, 0.22)",
        } as CSSProperties);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      offset={20}
      mobileOffset={16}
      visibleToasts={4}
      style={
        {
          ...toasterPalette,
        } as CSSProperties
      }
      toastOptions={{
        duration: 4000,
        style: {
          boxShadow: "var(--toast-shadow)",
        },
        classNames: {
          toast:
            "rounded-[calc(var(--radius)+4px)] backdrop-blur-xl",
          content: "gap-1.5",
          title: "text-sm font-semibold tracking-tight",
          description: "text-[13px] leading-5 opacity-80",
          icon: "mt-0.5",
          closeButton: "transition-transform duration-200 hover:scale-105",
          actionButton: "bg-primary text-primary-foreground hover:bg-primary/90",
          cancelButton: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
          loading:
            "border-primary/20 bg-primary/5 text-foreground dark:border-primary/30 dark:bg-primary/10",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
