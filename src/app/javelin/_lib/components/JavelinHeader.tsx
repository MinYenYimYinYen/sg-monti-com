"use client";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { javelinSelect } from "@/app/javelin/javelinSelect";
import { javelinActions } from "@/app/javelin/javelinSlice";
import { globalSettingsActions } from "@/app/globalSettings/_lib/globalSettingsSlice";
import { authSelect } from "@/app/auth/authSlice";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import {
  transformToQBJournalCSV,
  triggerCSVDownload,
} from "@/app/javelin/_lib/genLedgerTransform";

export function JavelinHeader() {
  const dispatch = useAppDispatch();
  const journalNoPrefix = useSelector(javelinSelect.journalNoPrefix);
  const hasUnsavedMappingChanges = useSelector(
    javelinSelect.hasUnsavedMappingChanges,
  );
  const liveAccountMap = useSelector(javelinSelect.liveAccountMap);
  const allAccountsMapped = useSelector(javelinSelect.allAccountsMapped);
  const files = useSelector(javelinSelect.files);
  const role = useSelector(authSelect.role);

  const canSaveMappings = hasUnsavedMappingChanges && role === "admin";
  const canDownload =
    allAccountsMapped && files.filter((f) => f.rows.length > 0).length > 0;

  const handleSaveMappings = async () => {
    await dispatch(
      globalSettingsActions.updateSettings({
        params: { genLedgerAccountMap: liveAccountMap },
        config: { showLoading: false, force: true },
      }),
    ).unwrap();
    dispatch(javelinActions.syncSavedAccountMap(liveAccountMap));
  };

  const handleDownload = () => {
    const csvString = transformToQBJournalCSV(
      files.filter((f) => f.rows.length > 0),
      liveAccountMap,
      journalNoPrefix,
    );
    triggerCSVDownload(csvString, "qb-journal-entries.csv");
  };

  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <div className="flex flex-col gap-1">
        <Label htmlFor="journal-no-prefix">Journal No Prefix</Label>
        <Input
          id="journal-no-prefix"
          value={journalNoPrefix}
          onChange={(e) =>
            dispatch(javelinActions.setJournalNoPrefix(e.target.value))
          }
          className="w-48"
        />
      </div>

      {canSaveMappings && (
        <Button
          variant="primary"
          intensity="solid"
          onClick={handleSaveMappings}
        >
          Save Account Mappings
        </Button>
      )}

      <Button
        variant="accent"
        intensity="solid"
        disabled={!canDownload}
        onClick={handleDownload}
      >
        Download QB CSV
      </Button>
    </div>
  );
}
