"use client";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { depositSelect } from "@/app/javelin/depositSelect";
import { depositActions } from "@/app/javelin/depositSlice";
import { globalSettingsActions } from "@/app/globalSettings/_lib/globalSettingsSlice";
import { authSelect } from "@/app/auth/authSlice";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import {
  transformToDepositCSV,
  triggerCSVDownload,
} from "@/app/javelin/_lib/depositTransform";

export function DepositHeader() {
  const dispatch = useAppDispatch();
  const journalNoPrefix = useSelector(depositSelect.journalNoPrefix);
  const hasUnsavedMappingChanges = useSelector(depositSelect.hasUnsavedMappingChanges);
  const liveAccountMap = useSelector(depositSelect.liveAccountMap);
  const allAccountsMapped = useSelector(depositSelect.allAccountsMapped);
  const allRowsBalanced = useSelector(depositSelect.allRowsBalanced);
  const rows = useSelector(depositSelect.rows);
  const role = useSelector(authSelect.role);

  const canSaveMappings = hasUnsavedMappingChanges && role === "admin";
  const canDownload = allAccountsMapped && rows.length > 0;

  const handleSaveMappings = async () => {
    await dispatch(
      globalSettingsActions.updateSettings({
        params: { depositAccountMap: liveAccountMap },
        config: { showLoading: false, force: true },
      }),
    ).unwrap();
    dispatch(depositActions.syncSavedAccountMap(liveAccountMap));
  };

  const handleDownload = () => {
    const csvString = transformToDepositCSV(rows, liveAccountMap, journalNoPrefix);
    triggerCSVDownload(csvString, "qb-deposit-entries.csv");
  };

  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <div className="flex flex-col gap-1">
        <Label htmlFor="deposit-journal-no-prefix">Journal No Prefix</Label>
        <Input
          id="deposit-journal-no-prefix"
          value={journalNoPrefix}
          onChange={(e) =>
            dispatch(depositActions.setJournalNoPrefix(e.target.value))
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
        variant={allRowsBalanced ? "accent" : "destructive"}
        intensity="solid"
        disabled={!canDownload}
        onClick={handleDownload}
      >
        Download QB CSV
      </Button>
    </div>
  );
}
