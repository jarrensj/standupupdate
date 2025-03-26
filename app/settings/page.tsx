'use client'

import { Switch } from "@/components/ui/switch"
import { useState } from "react";

const SettingsPage: React.FC = () => {
  const [isStandupMode, setIsStandupMode] = useState(true);

  const handleSwitchChange = () => {
    setIsStandupMode(!isStandupMode);
  };

  return (
    <>
      <h1>Settings</h1>
      <div className="flex items-center gap-2">
        standup mode toggle:
        <Switch checked={isStandupMode} onCheckedChange={handleSwitchChange} />
      </div>
      <p>current mode: {isStandupMode ? "standup mode" : "unemployed mode"}</p>
    </>
    );
};

export default SettingsPage;