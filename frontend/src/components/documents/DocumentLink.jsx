import { useState } from "react";
import { toast } from "sonner";
import { openDocument } from "../../services/documents";
import { cn } from "../../utils/cn";

export function DocumentLink({ url, label = "View document", fileName = "document", className = "" }) {
  const [opening, setOpening] = useState(false);

  const handleOpen = async (event) => {
    event.preventDefault();
    if (!url || opening) {
      return;
    }

    setOpening(true);

    try {
      await openDocument(url, fileName);
    } catch (error) {
      toast.error(error.message ?? "Unable to open document");
    } finally {
      setOpening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={!url || opening}
      className={cn(
        "font-medium text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400",
        className
      )}
    >
      {opening ? "Opening..." : label}
    </button>
  );
}
