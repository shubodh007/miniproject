import React from 'react';
import { ChatInterface } from '../smart-chat/components/chat/ChatInterface';

interface ChatPageProps {
  attachedFile?: { name: string; content: string } | null;
  clearAttachedFile?: () => void;
  prepopulatedQuery?: string | null;
  clearPrepopulatedQuery?: () => void;
  profileSnapshot?: any | null;
  user?: any | null;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  attachedFile,
  clearAttachedFile,
  prepopulatedQuery,
  clearPrepopulatedQuery,
  profileSnapshot,
  user
}) => {
  return (
    <div className="w-full h-full min-h-[calc(100vh-80px)]">
      <ChatInterface 
        attachedFile={attachedFile}
        clearAttachedFile={clearAttachedFile}
        prepopulatedQuery={prepopulatedQuery}
        clearPrepopulatedQuery={clearPrepopulatedQuery}
        profileSnapshot={profileSnapshot}
        user={user}
      />
    </div>
  );
};
