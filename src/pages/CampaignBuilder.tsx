import { useEffect, useState } from "react";
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

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", subject: "", sender: "", recipientMethod: "manual" as "manual" | "csv",
    manualEmails: "", body: "<p>Hello {{name}},</p><p>Your email content here.</p>", htmlMode: false,
  });
  const [recipients, setRecipients] = useState<{ email: string; name?: string }[]>([]);
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);

  const update = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => setForm(f => ({ ...f, [key]: val }));

  const parseManual = () => {
    const emails = form.manualEmails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
    const parsed = emails.map(e => ({ email: e, name: undefined }));
    const unique = parsed.filter((r, i, a) => a.findIndex(x => x.email === r.email) === i);
    setRecipients(unique);
    toast.success(`${unique.length} recipients parsed`);
  };

  const handleSend = () => {
    toast.success("Campaign created! (Demo mode — no emails sent)");
    navigate("/campaigns");
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
                <div className="border-2 border-dashed rounded-2xl p-10 text-center text-muted-foreground">
                  <p className="text-sm">Drag & drop a CSV file here, or click to browse</p>
                  <p className="text-xs mt-2">Columns: email (required), name (optional)</p>
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
          <Button onClick={handleSend} className="rounded-xl bg-success hover:bg-success/90 text-success-foreground">
            <Send className="h-4 w-4 mr-2" /> Send Campaign
          </Button>
        )}
      </div>
    </div>
  );
}
