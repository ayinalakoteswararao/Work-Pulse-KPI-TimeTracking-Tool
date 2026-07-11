import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-violet-600 group-[.toaster]:to-fuchsia-500 group-[.toaster]:text-white group-[.toaster]:border-0 group-[.toaster]:shadow-xl group-[.toaster]:shadow-violet-500/30",
          description: "group-[.toast]:text-white/90",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-violet-600 group-[.toast]:font-semibold",
          cancelButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white group-[.toast]:border-white/30",
          icon: "group-[.toast]:text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
