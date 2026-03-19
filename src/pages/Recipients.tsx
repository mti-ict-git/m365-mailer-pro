import { useState } from "react";
import { Users, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface ParsedRecipient {
  email: string;
  name: string;
  valid: boolean;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Recipients() {
  const [recipients, setRecipients] = useState<ParsedRecipient[]>([]);
  const [rawInput, setRawInput] = useState("");

  const handleParse = () => {
    const lines = rawInput.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
    const parsed: ParsedRecipient[] = lines.map(line => {
      const parts = line.split(/[<>]/).map(p => p.trim()).filter(Boolean);
      const email = parts.find(p => emailRegex.test(p)) || parts[parts.length - 1];
      const name = parts.length > 1 ? parts[0] : '';
      return { email, name, valid: emailRegex.test(email) };
    });
    const unique = parsed.filter((r, i, a) => a.findIndex(x => x.email === r.email) === i);
    setRecipients(unique);
    const invalid = unique.filter(r => !r.valid).length;
    toast.success(`${unique.length} recipients parsed${invalid > 0 ? `, ${invalid} invalid` : ''}`);
  };

  const removeRecipient = (email: string) => setRecipients(r => r.filter(x => x.email !== email));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recipients</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage and validate email recipients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl shadow-card border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-card-foreground">Add Recipients</h2>
          <textarea value={rawInput} onChange={e => setRawInput(e.target.value)} placeholder={"john@example.com\nJane Doe <jane@example.com>\nbob@company.com"} rows={8} className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="flex gap-2">
            <Button onClick={handleParse} className="rounded-xl"><Users className="h-4 w-4 mr-2" /> Parse & Validate</Button>
            <Button variant="outline" className="rounded-xl"><Upload className="h-4 w-4 mr-2" /> Upload CSV</Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl shadow-card border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-card-foreground">Parsed Recipients ({recipients.length})</h2>
            {recipients.length > 0 && (
              <span className="text-xs text-destructive font-medium">{recipients.filter(r => !r.valid).length} invalid</span>
            )}
          </div>
          {recipients.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No recipients yet
            </div>
          ) : (
            <div className="max-h-80 overflow-auto space-y-1">
              {recipients.map((r, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${r.valid ? 'bg-muted/30' : 'bg-destructive/5 border border-destructive/20'}`}>
                  <div className="min-w-0">
                    <p className={`truncate ${r.valid ? 'text-card-foreground' : 'text-destructive'}`}>{r.email}</p>
                    {r.name && <p className="text-xs text-muted-foreground truncate">{r.name}</p>}
                  </div>
                  <button onClick={() => removeRecipient(r.email)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
