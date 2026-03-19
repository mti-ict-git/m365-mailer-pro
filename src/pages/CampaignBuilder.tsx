import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { RichEmailEditor } from "@/components/RichEmailEditor";
import { toast } from "sonner";

const steps = ["Basic Info", "Recipients", "Email Content", "Review & Send"];

interface TemplateDefinition {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface TemplatesResponse {
  templates: TemplateDefinition[];
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", subject: "", sender: "", recipientMethod: "manual" as "manual" | "csv",
    manualEmails: "", body: "<p>Hello {{name}},</p><p>Your email content here.</p>", htmlMode: false,
  });
  const [recipients, setRecipients] = useState<{ email: string; name?: string }[]>([]);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => setForm(f => ({ ...f, [key]: val }));

  const parseRecipientsFromInput = () => {
    const emails = form.manualEmails.split(/[\n,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const parsed = emails.map((email) => ({ email, name: undefined }));
    const unique = parsed.filter((recipient, index, all) =>
      all.findIndex((value) => value.email === recipient.email) === index);
    const valid = unique.filter((recipient) => emailRegex.test(recipient.email));
    const invalidCount = unique.length - valid.length;
    return { valid, invalidCount };
  };

  const parseManual = () => {
    const { valid, invalidCount } = parseRecipientsFromInput();
    const unique = valid;
    setRecipients(unique);
    if (invalidCount > 0) {
      toast.warning(`${unique.length} recipients parsed, ${invalidCount} invalid skipped`);
      return;
    }
    toast.success(`${unique.length} recipients parsed`);
  };

  const handleCsvUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (lines.length === 0) {
        toast.error("CSV file is empty");
        return;
      }

      const rows = lines.map((line) => line.split(",").map((value) => value.trim()));
      const hasHeader = rows[0].some((value) => value.toLowerCase() === "email");
      const dataRows = hasHeader ? rows.slice(1) : rows;
      const mapped = dataRows
        .map((columns) => ({
          email: (columns[0] || "").toLowerCase(),
          name: columns[1] || undefined,
        }))
        .filter((recipient) => Boolean(recipient.email) && emailRegex.test(recipient.email));
      const unique = mapped.filter((recipient, index, all) =>
        all.findIndex((value) => value.email === recipient.email) === index);

      setRecipients(unique);
      toast.success(`${unique.length} recipients loaded from CSV`);
    };

    reader.onerror = () => {
      toast.error("Unable to read CSV file");
    };

    reader.readAsText(file);
  };

  const handleSend = async () => {
    const resolvedRecipients = recipients.length > 0 ? recipients : parseRecipientsFromInput().valid;
    if (resolvedRecipients.length === 0) {
      toast.error("Add at least one valid recipient");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          subject: form.subject,
          sender: form.sender,
          bodyHtml: form.body,
          recipients: resolvedRecipients,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message || "Failed to create campaign");
      }

      toast.success("Campaign created");
      navigate("/campaigns");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to create campaign";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch("/api/auth/templates");
        if (!response.ok) {
          throw new Error("Failed");
        }
        const payload = (await response.json()) as TemplatesResponse;
        setTemplates(payload.templates || []);
      } catch {
        setTemplates([]);
      }
    };

    void loadTemplates();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/auth/settings");
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { mail?: { defaultSender?: string } };
        if (payload.mail?.defaultSender) {
          setForm((current) => ({ ...current, sender: payload.mail?.defaultSender || current.sender }));
        }
      } catch {
        return;
      }
    };

    void loadSettings();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Campaigns
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">New Campaign</h1>
        <p className="text-sm text-muted-foreground mt-1">Create and send a new email campaign</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-colors ${
              i < step ? 'bg-success text-success-foreground' : i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-card rounded-2xl shadow-card border p-6 space-y-5">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Q1 Newsletter" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input value={form.subject} onChange={e => update('subject', e.target.value)} placeholder="e.g. Important Updates" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Sender Email</Label>
                <Input value={form.sender} onChange={e => update('sender', e.target.value)} placeholder="e.g. marketing@mti.com" className="rounded-xl" />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex gap-2">
                <button onClick={() => update('recipientMethod', 'manual')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${form.recipientMethod === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Manual Input</button>
                <button onClick={() => update('recipientMethod', 'csv')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${form.recipientMethod === 'csv' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Upload CSV</button>
              </div>
              {form.recipientMethod === 'manual' ? (
                <div className="space-y-2">
                  <Label>Email Addresses (one per line or comma-separated)</Label>
                  <Textarea value={form.manualEmails} onChange={e => update('manualEmails', e.target.value)} placeholder={"john@example.com\njane@example.com"} rows={6} className="rounded-xl font-mono text-sm" />
                  <Button variant="secondary" size="sm" onClick={parseManual} className="rounded-xl">Parse & Validate</Button>
                </div>
              ) : (
                <div className="border rounded-2xl p-6 space-y-3">
                  <Label>Upload CSV File</Label>
                  <Input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="rounded-xl" />
                  <p className="text-xs text-muted-foreground">Columns: email (required), name (optional)</p>
                </div>
              )}
              {recipients.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{recipients.length} recipients parsed</p>
                  <div className="max-h-40 overflow-auto text-xs space-y-1 bg-muted/50 rounded-xl p-3">
                    {recipients.slice(0, 10).map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-foreground">{r.email}</span>
                        {r.name && <span className="text-muted-foreground">({r.name})</span>}
                      </div>
                    ))}
                    {recipients.length > 10 && <p className="text-muted-foreground">...and {recipients.length - 10} more</p>}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {templates.length > 0 && (
                <div className="space-y-2">
                  <Label>Template</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => {
                          update("subject", template.subject);
                          update("body", template.body);
                        }}
                        className="text-left border rounded-xl px-3 py-2 hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground">{template.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{template.subject}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <RichEmailEditor value={form.body} onChange={(val) => update("body", val)} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Review Campaign</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Name</p><p className="font-medium text-foreground">{form.name || '—'}</p></div>
                <div><p className="text-muted-foreground">Subject</p><p className="font-medium text-foreground">{form.subject || '—'}</p></div>
                <div><p className="text-muted-foreground">Sender</p><p className="font-medium text-foreground">{form.sender || '—'}</p></div>
                <div><p className="text-muted-foreground">Recipients</p><p className="font-medium text-foreground">{recipients.length}</p></div>
              </div>
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 text-sm text-warning">
                ⚠️ You are about to send emails to {recipients.length} recipients. This action cannot be undone.
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : navigate('/campaigns')} className="rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} className="rounded-xl">
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={() => void handleSend()} disabled={isSubmitting} className="rounded-xl bg-success hover:bg-success/90 text-success-foreground">
            <Send className="h-4 w-4 mr-2" /> Send Campaign
          </Button>
        )}
      </div>
    </div>
  );
}
