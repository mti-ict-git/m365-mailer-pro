import { useState, useMemo } from "react";
import { Code, Eye, Type, Variable } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const TEMPLATE_VARIABLES = [
  { key: "{{name}}", label: "Name", sample: "John Doe" },
  { key: "{{email}}", label: "Email", sample: "john@example.com" },
  { key: "{{company}}", label: "Company", sample: "Acme Corp" },
  { key: "{{title}}", label: "Title", sample: "Manager" },
];

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link", "image"],
    ["clean"],
  ],
};

interface RichEmailEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export function RichEmailEditor({ value, onChange }: RichEmailEditorProps) {
  const [mode, setMode] = useState<"richtext" | "html" | "preview">("richtext");

  const previewHtml = useMemo(() => {
    let html = value;
    TEMPLATE_VARIABLES.forEach((v) => {
      html = html.replaceAll(v.key, `<span style="background:#dbeafe;color:#1d4ed8;padding:1px 4px;border-radius:4px;font-weight:500;">${v.sample}</span>`);
    });
    return html;
  }, [value]);

  const insertVariable = (key: string) => {
    if (mode === "html") {
      onChange(value + key);
    } else {
      // For rich text, append to end
      const updated = value.replace(/<\/p>$/, `${key}</p>`);
      onChange(updated === value ? value + key : updated);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Label className="text-sm font-semibold">Email Body</Label>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setMode("richtext")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === "richtext" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Type className="h-3.5 w-3.5" /> Rich Text
          </button>
          <button
            onClick={() => setMode("html")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === "html" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code className="h-3.5 w-3.5" /> HTML
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === "preview" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
        </div>
      </div>

      {/* Variable chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Variable className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Insert:</span>
        {TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v.key}
            onClick={() => insertVariable(v.key)}
            className="px-2 py-1 rounded-md bg-accent text-accent-foreground text-xs font-mono hover:bg-primary/10 transition-colors"
          >
            {v.key}
          </button>
        ))}
      </div>

      {/* Editor modes */}
      {mode === "richtext" && (
        <div className="rounded-xl overflow-hidden border">
          <ReactQuill
            theme="snow"
            value={value}
            onChange={onChange}
            modules={quillModules}
          />
        </div>
      )}

      {mode === "html" && (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={14}
          className="rounded-xl font-mono text-sm leading-relaxed"
          placeholder="<p>Hello {{name}},</p>"
        />
      )}

      {mode === "preview" && (
        <div className="rounded-xl border bg-background">
          <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              Preview with sample data
            </span>
          </div>
          <div className="p-5">
            <div className="max-w-lg mx-auto bg-card rounded-xl border shadow-soft p-6">
              <div
                className="prose prose-sm max-w-none text-card-foreground [&_a]:text-primary"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
