import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "@/lib/primatives/string/htmlToMarkdown";

describe("htmlToMarkdown text and structure", () => {
  it("converts paragraphs and headings 1 to 6", () => {
    expect(htmlToMarkdown("<h1>One</h1><h3>Three</h3><h6>Six</h6><p>Body</p>")).toBe(
      "# One\n\n### Three\n\n###### Six\n\nBody",
    );
  });

  it("converts bold, italic and strikethrough", () => {
    expect(htmlToMarkdown("<p><strong>b</strong> <em>i</em> <s>gone</s></p>")).toBe("**b** _i_ ~~gone~~");
  });

  it("treats underline as plain text", () => {
    expect(htmlToMarkdown("<p><u>under</u></p>")).toBe("under");
  });

  it("converts links and inline code", () => {
    expect(htmlToMarkdown('<p><a href="https://sgmonti.com">site</a> and <code>x</code></p>')).toBe(
      "[site](https://sgmonti.com) and `x`",
    );
  });

  it("converts blockquotes", () => {
    expect(htmlToMarkdown("<blockquote><p>quoted</p></blockquote>")).toBe("> quoted");
  });

  it("converts code blocks to fences", () => {
    expect(htmlToMarkdown("<pre><code>const a = 1</code></pre>")).toBe("```\nconst a = 1\n```");
  });

  it("converts horizontal rules and hard breaks", () => {
    expect(htmlToMarkdown("<p>a</p><hr><p>b<br>c</p>")).toBe("a\n\n---\n\nb  \nc");
  });

  it("returns an empty string for empty html", () => {
    expect(htmlToMarkdown("")).toBe("");
  });

  it("returns the same output when called twice with the same html", () => {
    const html = "<h2>Title</h2><ul><li><p>one</p></li></ul>";
    expect(htmlToMarkdown(html)).toBe(htmlToMarkdown(html));
  });
});

describe("htmlToMarkdown lists", () => {
  it("converts bullet lists, with TipTap paragraphs inside items", () => {
    expect(htmlToMarkdown("<ul><li><p>one</p></li><li><p>two</p></li></ul>")).toBe("- one\n- two");
  });

  it("converts ordered lists", () => {
    expect(htmlToMarkdown("<ol><li><p>first</p></li><li><p>second</p></li></ol>")).toBe("1. first\n2. second");
  });

  it("indents nested lists", () => {
    expect(htmlToMarkdown("<ul><li><p>parent</p><ul><li><p>child</p></li></ul></li></ul>")).toBe(
      "- parent\n  - child",
    );
  });

  it("indents nested ordered lists by the marker width", () => {
    expect(
      htmlToMarkdown("<ol><li><p>one</p><ol><li><p>inner</p></li></ol></li><li><p>two</p></li></ol>"),
    ).toBe("1. one\n   1. inner\n2. two");
  });

  it("keeps a second paragraph inside a list item indented", () => {
    expect(htmlToMarkdown("<ul><li><p>first</p><p>more</p></li><li><p>next</p></li></ul>")).toBe(
      "- first\n\n  more\n- next",
    );
  });

  it("honors the start attribute of an ordered list", () => {
    expect(htmlToMarkdown('<ol start="3"><li><p>c</p></li><li><p>d</p></li></ol>')).toBe("3. c\n4. d");
  });
});

describe("htmlToMarkdown styling the editor emits", () => {
  it("drops highlight marks and keeps the text", () => {
    expect(htmlToMarkdown('<p>a <mark data-color="#ff0" style="background-color: #ff0">hot</mark> b</p>')).toBe(
      "a hot b",
    );
  });

  it("drops color styles and keeps the text", () => {
    expect(htmlToMarkdown('<p><span style="color: #ff0000">red</span> text</p>')).toBe("red text");
  });
});

describe("htmlToMarkdown tables", () => {
  it("converts a table with a header row", () => {
    const html =
      "<table><thead><tr><th>Name</th><th>Price</th></tr></thead>" +
      "<tbody><tr><td>Aeration</td><td>$80</td></tr></tbody></table>";
    expect(htmlToMarkdown(html)).toBe("| Name | Price |\n| --- | --- |\n| Aeration | $80 |");
  });

  it("flattens the paragraphs TipTap puts inside cells", () => {
    const html =
      "<table><tbody>" +
      "<tr><th><p>Name</p></th><th><p>Price</p></th></tr>" +
      "<tr><td><p>Aeration</p></td><td><p>$80</p></td></tr>" +
      "</tbody></table>";
    expect(htmlToMarkdown(html)).toBe("| Name | Price |\n| --- | --- |\n| Aeration | $80 |");
  });

  it("promotes the first row when the table has no header row", () => {
    const html =
      "<table><tbody>" +
      "<tr><td><p>Service</p></td><td><p>Price</p></td></tr>" +
      "<tr><td><p>Seeding</p></td><td><p>$120</p></td></tr>" +
      "</tbody></table>";
    expect(htmlToMarkdown(html)).toBe("| Service | Price |\n| --- | --- |\n| Seeding | $120 |");
  });

  it("keeps multi-paragraph cells on one line", () => {
    const html = "<table><tbody><tr><td><p>line one</p><p>line two</p></td><td><p>x</p></td></tr></tbody></table>";
    expect(htmlToMarkdown(html)).toBe("| line one line two | x |\n| --- | --- |");
  });

  it("escapes pipes inside cells", () => {
    const html = "<table><tbody><tr><td><p>a|b</p></td><td><p>c</p></td></tr></tbody></table>";
    expect(htmlToMarkdown(html)).toBe("| a\\|b | c |\n| --- | --- |");
  });

  it("keeps surrounding paragraphs separated from the table", () => {
    const html =
      "<p>before</p><table><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table><p>after</p>";
    expect(htmlToMarkdown(html)).toBe("before\n\n| a | b |\n| --- | --- |\n\nafter");
  });

  it("keeps an empty cell as an empty column", () => {
    const html =
      "<table><tbody><tr><td><p>a</p></td><td><p></p></td></tr><tr><td><p>b</p></td><td><p>c</p></td></tr></tbody></table>";
    expect(htmlToMarkdown(html)).toBe("| a |  |\n| --- | --- |\n| b | c |");
  });

  it("counts columns correctly when the header has an escaped pipe", () => {
    const html = "<table><tbody><tr><th><p>a|b</p></th><th><p>c</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>";
    expect(htmlToMarkdown(html)).toBe("| a\\|b | c |\n| --- | --- |\n| 1 | 2 |");
  });
});
