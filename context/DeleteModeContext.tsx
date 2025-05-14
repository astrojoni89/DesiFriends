import React, { createContext, useContext, useState } from "react";

type DeleteModeContextType = {
  deleteModeId: string | null;
  setDeleteModeId: (id: string | null) => void;
};

const DeleteModeContext = createContext<DeleteModeContextType | undefined>(undefined);

export const DeleteModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [deleteModeId, setDeleteModeId] = useState<string | null>(null);

  return (
    <DeleteModeContext.Provider value={{ deleteModeId, setDeleteModeId }}>
      {children}
    </DeleteModeContext.Provider>
  );
};

export const useDeleteMode = () => {
  const context = useContext(DeleteModeContext);
  if (!context) {
    throw new Error("useDeleteMode must be used within a DeleteModeProvider");
  }
  return context;
};
