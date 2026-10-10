import type { ReactNode } from "react";
export default function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading reveal flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow mb-4 flex items-center gap-2">
          <span className="h-px w-5 bg-primary" />
          {eyebrow}
        </p>
        <h1 className="page-title">
          {title}
          <span className="text-primary">.</span>
        </h1>
        <p className="page-description">{description}</p>
      </div>
      {children}
    </header>
  );
}
