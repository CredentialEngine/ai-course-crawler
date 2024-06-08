import { ComponentProps, forwardRef } from "react";
import { Link } from "wouter";

interface MenuLinkProps extends ComponentProps<"a"> {
  to: string;
  compact?: boolean;
  currentLocation: string;
}

const MenuLink = forwardRef<HTMLAnchorElement, MenuLinkProps>(
  ({ to, compact, currentLocation, children }, _ref) => {
    const isActive = currentLocation.startsWith(to);
    const commonClasses = `flex items-center px-3 py-2 transition-all rounded-lg ${
      compact ? "mx-[-0.65rem] gap-4 rounded-xl" : "gap-3"
    }`;
    const inactiveClasses = `${commonClasses} ${
      compact
        ? "text-foreground hover:text-foreground"
        : "text-muted-foreground hover:text-primary"
    }`;
    const activeClasses = `${commonClasses} bg-muted text-primary hover:text-primary`;

    return (
      <Link to={to} className={isActive ? activeClasses : inactiveClasses}>
        {children}
      </Link>
    );
  }
);

export default MenuLink;
