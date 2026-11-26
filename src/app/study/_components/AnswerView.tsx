import type { CardAnswer } from "@/app/study/StudyTypes";

/** An answer in the shape it is stored in: a sentence, a list, numbered steps, labeled groups or a table. */
export function AnswerView({ answer }: { answer: CardAnswer }) {
  switch (answer.format) {
    case "text":
      return <p className="whitespace-pre-line text-base text-foreground">{answer.text}</p>;
    case "points":
      return (
        <ul className="list-disc space-y-1 pl-5 text-base text-foreground">
          {answer.points.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="list-decimal space-y-1 pl-5 text-base text-foreground">
          {answer.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      );
    case "groups":
      return (
        <div className="space-y-3">
          {answer.groups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <p className="font-medium text-foreground">{group.label}</p>
              <ul className="list-disc space-y-1 pl-5 text-base text-foreground">
                {group.points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-foreground">
            <thead>
              <tr>
                {answer.columns.map((column, index) => (
                  <th key={index} className="border border-border bg-accent/10 px-2 py-1 text-left font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {answer.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border border-border px-2 py-1 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
