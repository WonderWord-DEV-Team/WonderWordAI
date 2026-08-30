import { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "coral" | "teal" | "black" | "white" | "amber";

const variantStyles: Record<Variant, { bg: string; shadow: string; text: string }> = {
  coral: { bg: "bg-[#E8604F]", shadow: "shadow-[0_4px_0_0_#C0463A]", text: "text-white" },
  teal: { bg: "bg-[#7FE5D4]", shadow: "shadow-[0_4px_0_0_#1A5C50]", text: "text-[#0F3D35]" },
  black: { bg: "bg-[#1A1A2E]", shadow: "shadow-[0_4px_0_0_#000000]", text: "text-white" },
  white: { bg: "bg-white", shadow: "shadow-[0_4px_0_0_#D1D5DB]", text: "text-[#1A1A2E]" },
  amber: { bg: "bg-[#F5A623]", shadow: "shadow-[0_4px_0_0_#C17E0E]", text: "text-[#1A1A2E]" },
};
type BaseProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" };

type LinkProps = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a" };

export function Button({ variant = "coral", children, className = "", ...props }: ButtonProps | LinkProps) {
  const styles = variantStyles[variant];
 const baseClasses = `min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-black text-[15px] ${styles.bg} ${styles.text} ${styles.shadow} transition-all duration-100 active:translate-y-1 active:shadow-none hover:brightness-105 ${className}`;
  if ("as" in props && props.as === "a") {
    const { as, ...anchorProps } = props as LinkProps;
    return (
      <a className={baseClasses} {...anchorProps}>
        {children}
      </a>
    );
  }

  const { as, ...buttonProps } = props as ButtonProps;
  return (
    <button className={baseClasses} {...buttonProps}>
      {children}
    </button>
  );
}