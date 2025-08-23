import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Send, AtSign, X, ChevronUp, Cpu, Square, Image, Music, FileX } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { useChatInputStore } from '../../stores/chatInputStore';
import { useSettingsStore } from '../../stores/SettingsStore';
import { useModelStore } from '../../stores/ModelStore';
import { ConfigService } from '../../services/configService';
import { MediaSelector } from './MediaSelector';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (messageData: string | { text: string; mediaAttachments?: any[] }) => void;
  onStopStreaming?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholderOverride?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  onInputChange,
  onSendMessage,
  onStopStreaming,
  disabled = false,
  isLoading = false,
  placeholderOverride,
}) => {
  const {
    fileReferences,
    mediaAttachments,
    removeFileReference,
    removeMediaAttachment,
    clearFileReferences,
    clearMediaAttachments,
  } = useChatInputStore();
  
  const { providers } = useSettingsStore();
  const { currentModel, currentProvider, setCurrentModel } = useModelStore();
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, Array<{model: string, source: 'settings' | 'config'}>>>({});
  const [isModelPopoverOpen, setIsModelPopoverOpen] = useState(false);

  // Load available models grouped by provider
  useEffect(() => {
    const loadModelsByProvider = async () => {
      const providerModels: Record<string, Array<{model: string, source: 'settings' | 'config'}>> = {};
      
      // Add models from settings store
      Object.entries(providers).forEach(([providerName, providerConfig]) => {
        const normalizedProvider = providerName.toLowerCase();
        if (!providerModels[normalizedProvider]) {
          providerModels[normalizedProvider] = [];
        }
        
        if (providerConfig?.models) {
          providerConfig.models.forEach(model => {
            // Check for duplicates within the same provider
            const exists = providerModels[normalizedProvider].some(m => m.model === model);
            if (!exists) {
              providerModels[normalizedProvider].push({
                model,
                source: 'settings'
              });
            }
          });
        }
      });
      
      // Add models from config.toml profiles
      try {
        const profiles = await ConfigService.getAllProfiles();
        Object.entries(profiles).forEach(([, profile]) => {
          const normalizedProvider = profile.model_provider.toLowerCase();
          if (!providerModels[normalizedProvider]) {
            providerModels[normalizedProvider] = [];
          }
          
          // Check for duplicates within the same provider
          const exists = providerModels[normalizedProvider].some(m => m.model === profile.model);
          if (!exists) {
            providerModels[normalizedProvider].push({
              model: profile.model,
              source: 'config'
            });
          }
        });
      } catch (error) {
        console.error('Failed to load config.toml profiles:', error);
      }
      
      setModelsByProvider(providerModels);
    };
    
    loadModelsByProvider();
  }, [providers]);

  // Helper function to determine if provider should use OSS
  const shouldUseOss = (provider: string) => {
    return provider.toLowerCase() !== 'openai';
  };

  const generateSmartPrompt = (): string => {
    if (fileReferences.length === 0) return '';
    
    // Use the accurate isDirectory flag
    const directories = fileReferences.filter(ref => ref.isDirectory);
    const files = fileReferences.filter(ref => !ref.isDirectory);
    
    const filePaths = fileReferences.map(ref => ref.relativePath).join(' ');
    
    if (directories.length > 0 && files.length === 0) {
      return directories.length === 1 
        ? `${filePaths}`
        : `${filePaths}`;
    } else if (files.length > 0 && directories.length === 0) {
      return files.length === 1 
        ? `${filePaths}`
        : `${filePaths}`;
    } else {
      // Mixed files and folders
      return `${filePaths}`;
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return;

    // Build message content with file references
    let messageContent = inputValue;
    if (fileReferences.length > 0) {
      const smartPrompt = generateSmartPrompt();
      messageContent = `${smartPrompt}\n\n${inputValue}`;
    }

    // Pass media attachments along with the message
    const messageParts = {
      text: messageContent,
      mediaAttachments: mediaAttachments.length > 0 ? mediaAttachments : undefined
    };

    console.log("📤 ChatInput: Sending message parts:", messageParts);
    console.log("📸 Media attachments count:", mediaAttachments.length);
    
    onSendMessage(messageParts);
    onInputChange('');
    clearFileReferences();
    clearMediaAttachments();
  };

  const handleStopStreaming = () => {
    if (onStopStreaming) {
      onStopStreaming();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-shrink-0 border-t p-4 bg-white">
      {/* File references display */}
      {fileReferences.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 items-center">
          <AtSign className="w-4 h-4 text-gray-500" />
          {fileReferences.map((ref) => (
            <TooltipProvider key={ref.path}>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-gray-200"
                  >
                    <span>{ref.name}</span>
                    <X
                      className="w-3 h-3 hover:bg-gray-300 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFileReference(ref.path);
                      }}
                    />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{ref.relativePath}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFileReferences}
            className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Media attachments display */}
      {mediaAttachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 items-center">
          {mediaAttachments.map((attachment) => (
            <TooltipProvider key={attachment.id}>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-1"
                  >
                    {attachment.type === 'image' ? (
                      <Image className="w-3 h-3 text-blue-500" />
                    ) : (
                      <Music className="w-3 h-3 text-green-500" />
                    )}
                    <span className="text-xs font-medium">{attachment.name}</span>
                    <X
                      className="w-3 h-3 hover:bg-gray-300 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMediaAttachment(attachment.id);
                      }}
                    />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p>{attachment.path}</p>
                    <p className="text-gray-500 mt-1">{attachment.type} • {attachment.mimeType}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMediaAttachments}
            className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
          >
            <FileX className="w-3 h-3 mr-1" />
            Clear media
          </Button>
        </div>
      )}
      
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholderOverride || "Type your message..."}
            className="min-h-[40px] max-h-[120px] pr-10"
            disabled={false}
          />
          <div className="absolute right-2 top-2">
            <MediaSelector />
          </div>
        </div>
        {isLoading ? (
          <Button
            onClick={handleStopStreaming}
            size="sm"
            className="self-end bg-red-500 hover:bg-red-600 text-white"
            variant="default"
          >
            <Square className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || disabled}
            size="sm"
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {/* Model Selection Bar */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Cpu className="w-3 h-3" />
          <span>Current:</span>
          <Badge variant="outline" className="text-xs">
            {currentProvider}/{currentModel}
          </Badge>
        </div>
        
        <Popover open={isModelPopoverOpen} onOpenChange={setIsModelPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Switch Model
              <ChevronUp className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-3" align="end">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Select Model</h4>
              <div className="max-h-64 overflow-y-auto space-y-3">
                {Object.keys(modelsByProvider).length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No models available</p>
                ) : (
                  Object.entries(modelsByProvider).map(([providerName, models]) => (
                    <div key={providerName} className="space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1">
                        <h5 className="font-medium text-xs text-gray-700 uppercase tracking-wide">
                          {providerName}
                        </h5>
                        <div className="flex-1 border-t border-gray-200"></div>
                        {shouldUseOss(providerName) && (
                          <Badge variant="outline" className="text-xs">
                            --oss
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        {models.map((modelInfo, index) => (
                          <Button
                            key={`${providerName}-${modelInfo.model}-${index}`}
                            variant={currentModel === modelInfo.model && currentProvider.toLowerCase() === providerName ? "default" : "ghost"}
                            className="w-full justify-start text-left h-auto p-2"
                            onClick={() => {
                              setCurrentModel(modelInfo.model, providerName);
                              setIsModelPopoverOpen(false);
                            }}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium text-sm">{modelInfo.model}</span>
                              <Badge 
                                variant={modelInfo.source === 'config' ? 'default' : 'secondary'} 
                                className="text-xs"
                              >
                                {modelInfo.source === 'config' ? 'config' : 'settings'}
                              </Badge>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">
                  💡 Add more models in Settings or edit ~/.codex/config.toml
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
