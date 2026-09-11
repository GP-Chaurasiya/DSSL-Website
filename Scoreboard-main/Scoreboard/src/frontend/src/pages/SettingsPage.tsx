import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { getAllMatches, createMatch } from "@/lib/api";
import { Download, Monitor, Moon, Settings, Sun, Upload } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";


export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await getAllMatches();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DSSL-matches-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Matches exported successfully");
    } catch {
      toast.error("Failed to export matches");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importMatches(parsed);
      toast.success("Matches imported successfully");
    } catch {
      toast.error("Failed to import matches");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-5 max-w-xl" data-ocid="settings.page">
      <Card className="shadow-xs border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-[15px]">
            <Settings className="w-4 h-4 text-[#003E8A]" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Theme */}
          <div className="space-y-2" data-ocid="settings.theme.row">
            <Label className="font-medium text-sm">Appearance</Label>
            <p className="text-xs text-muted-foreground">
              Choose your preferred color scheme
            </p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                data-ocid="settings.theme.light.button"
                onClick={() => setTheme("light")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex-1 justify-center ${theme === "light" ? "bg-[#003E8A] text-white border-[#003E8A]" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                <Sun className="w-4 h-4" /> Light
              </button>
              <button
                type="button"
                data-ocid="settings.theme.dark.button"
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex-1 justify-center ${theme === "dark" ? "bg-[#003E8A] text-white border-[#003E8A]" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                <Moon className="w-4 h-4" /> Dark
              </button>
              <button
                type="button"
                data-ocid="settings.theme.system.button"
                onClick={() => setTheme("system")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex-1 justify-center ${theme === "system" ? "bg-[#003E8A] text-white border-[#003E8A]" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                <Monitor className="w-4 h-4" /> System
              </button>
            </div>
          </div>
          <Separator />

          <div
            className="flex items-center justify-between py-1"
            data-ocid="settings.notifications.row"
          >
            <div>
              <Label className="font-medium text-sm">Match Notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Show alerts when match status changes
              </p>
            </div>
            <Switch data-ocid="settings.notifications.switch" defaultChecked />
          </div>
          <Separator />
          <div
            className="flex items-center justify-between py-1"
            data-ocid="settings.autosave.row"
          >
            <div>
              <Label className="font-medium text-sm">Auto-save Scores</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically save score updates
              </p>
            </div>
            <Switch data-ocid="settings.autosave.switch" defaultChecked />
          </div>
          <Separator />
          <div
            className="flex items-center justify-between py-1"
            data-ocid="settings.sound.row"
          >
            <div>
              <Label className="font-medium text-sm">Sound Effects</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Play sound when score is updated
              </p>
            </div>
            <Switch data-ocid="settings.sound.switch" />
          </div>
        </CardContent>
      </Card>

      {/* Import / Export */}
      <Card className="shadow-xs border-border">
        <CardHeader>
          <CardTitle className="font-display text-[15px]">
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-1">
            <div>
              <Label className="font-medium text-sm">Export Matches</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download all match data as JSON
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              data-ocid="settings.export.button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#003E8A] text-white text-sm font-medium hover:bg-[#003D9A] transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exporting..." : "Export"}
            </button>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1">
            <div>
              <Label className="font-medium text-sm">Import Matches</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload match data from JSON file
              </p>
            </div>
            <label
              data-ocid="settings.import.button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {importing ? "Importing..." : "Import"}
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={importing}
                className="hidden"
                data-ocid="settings.import.input"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs border-border">
        <CardHeader>
          <CardTitle className="font-display text-[15px]">
            About DSSL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Dev Sanskriti School League — Annual Inter-Dal Sports
            Tournament.
          </p>
          <p className="font-medium text-foreground">Version 1.0.0</p>
          <p>
            © {new Date().getFullYear()} DSSL.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "DSSL")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#003E8A] hover:underline"
            >
              Built with caffeine.ai
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
