import React from "react";
import { Button } from "../ui/button";
import {
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  FolderTree,
  PencilIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { useConversationStore } from "@/stores/ConversationStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useNoteStore } from "@/stores/NoteStore";

interface AppToolbarProps {
  onOpenConfig: () => void;
  onCreateNewSession?: () => void;
}

export const AppToolbar: React.FC<AppToolbarProps> = ({
  onOpenConfig,
  onCreateNewSession,
}) => {
  const { setPendingNewConversation, setCurrentConversation } =
    useConversationStore();
  const { createNote, setCurrentNote } = useNoteStore();
  const {
    showFileTree,
    showSessionList,
    showNotesList,
    activeTab,
    toggleFileTree,
    toggleSessionList,
    toggleNotesList,
    setActiveTab,
  } = useLayoutStore();

  const handleToggleLeftPanel = () => {
    if (activeTab === "chat") {
      toggleSessionList();
    } else if (activeTab === "notes") {
      toggleNotesList();
    }
  };

  const isLeftPanelVisible =
    activeTab === "chat" ? showSessionList : showNotesList;

  const handleCreateNote = () => {
    const newNote = createNote();
    setCurrentNote(newNote.id);
  };

  const handleCreateConversation = () => {
    if (onCreateNewSession) {
      // Use the callback for full session creation if provided
      onCreateNewSession();
    } else {
      // Set pending state to prepare for new conversation
      setPendingNewConversation(true);
      // Clear current conversation to show new chat interface
      // The actual session ID will be created when user sends first message
      setCurrentConversation('');
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <div className="flex items-center gap-1 min-w-0">
        {/* File Tree Toggle button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFileTree}
          className="h-7 px-1.5 shrink-0"
          title="Toggle File Tree"
        >
          <FolderTree
            className={`w-4 h-4 ${showFileTree ? "text-blue-600" : ""}`}
          />
        </Button>

        {/* Panel Toggle button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleLeftPanel}
          className="h-7 px-1.5 shrink-0"
        >
          {isLeftPanelVisible ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </Button>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="min-w-0 flex-1 max-w-[200px]"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="text-xs px-2">
              chat
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs px-2">
              notes
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab == "chat" && (
        <div className="flex items-center gap-1 shrink-0">
          {/* Create Conversation Button */}
          <Button
            onClick={handleCreateConversation}
            size="sm"
            className="h-7 w-7 p-0"
            title="Create New Conversation"
          >
            <PencilIcon className="h-3 w-3" />
          </Button>

          {/* Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenConfig}
            className="h-7 px-1.5 shrink-0"
            title="Configuration Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      )}

      {activeTab === "notes" && (
        <div className="flex items-center gap-1 shrink-0 pr-2">
          <Button
            onClick={handleCreateNote}
            size="sm"
            className="h-7 w-7 p-0"
            title="Create New Note"
          >
            <PencilIcon className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
