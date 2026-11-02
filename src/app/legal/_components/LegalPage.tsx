import { ReactNode } from "react";

export type LegalSection = {
  heading: string;
  paragraphs: ReactNode[];
};

type LegalPageProps = {
  title: string;
  effectiveDate: string;
  sections: LegalSection[];
};

export function LegalPage({ title, effectiveDate, sections }: LegalPageProps) {
  return (
    <div className="h-full overflow-y-auto">
      <article className="mx-auto max-w-3xl space-y-6 p-6 text-foreground">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Spring-Green Lawn Care, a trade name of GM Lawncare Incorporated
          </p>
          <p className="text-sm text-muted-foreground">Effective {effectiveDate}</p>
        </header>

        {sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="text-lg font-semibold">{section.heading}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
