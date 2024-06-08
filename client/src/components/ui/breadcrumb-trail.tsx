import { Link } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "./breadcrumb";

export interface BreadcrumbTrailProps {
  items: {
    label: string;
    href: string;
  }[];
}

export default function BreadcrumbTrail(props: BreadcrumbTrailProps) {
  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        {props.items
          .map((item, index) => (
            <BreadcrumbItem key={`bc-comp-${index}`}>
              <BreadcrumbLink asChild>
                <Link href={item.href}>{item.label}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          ))
          .flatMap((component, index) =>
            index < props.items.length - 1
              ? [component, <BreadcrumbSeparator key={`bc-sep-${index}`} />]
              : component
          )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
