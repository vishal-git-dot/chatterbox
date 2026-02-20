import { useState, useEffect, useRef } from 'react';
import { Message, User } from '@/types/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import ReactionPicker from './ReactionPicker';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { decryptMessage } from '@/lib/encryption';
import { Lock, Check, CheckCheck, Pencil, Trash2, Forward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface MessageListProps {
  messages: Message[];
  chatId: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onForwardMessage?: (messageText: string, toUserId: string) => void;
  searchQuery?: string;
  contacts?: User[];
}

const MessageList = ({ messages, chatId, onAddReaction, onEditMessage, onDeleteMessage, onForwardMessage, searchQuery = '', contacts = [] }: MessageListProps) => {
  const { currentUser } = useAuth();
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<{ id: string; text: string } | null>(null);
  const [selectedForwardContact, setSelectedForwardContact] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Decrypt messages when they change
  useEffect(() => {
    const decryptAll = async () => {
      const decrypted: Record<string, string> = {};
      for (const message of messages) {
        if (message.deleted) {
          decrypted[message.id] = 'This message was deleted';
        } else if (message.encrypted) {
          decrypted[message.id] = await decryptMessage(message.text, chatId);
        } else {
          decrypted[message.id] = message.text;
        }
      }
      setDecryptedMessages(decrypted);
    };
    decryptAll();
  }, [messages, chatId]);

  const handleEditSubmit = () => {
    if (editingMessage && editingMessage.text.trim()) {
      onEditMessage(editingMessage.id, editingMessage.text.trim());
      setEditingMessage(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      onDeleteMessage(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleForwardSubmit = () => {
    if (forwardingMessage && selectedForwardContact && onForwardMessage) {
      onForwardMessage(forwardingMessage.text, selectedForwardContact);
      setForwardingMessage(null);
      setSelectedForwardContact(null);
    }
  };

  return (
    <>
      <ScrollArea className="flex-1 px-3 py-4 md:px-4">
        <div className="space-y-3 md:space-y-4">
          {messages.map((message, index) => {
            const isOwn = message.senderId === currentUser?.id;
            const reactions = message.reactions || [];
            const isDeleted = message.deleted;
            const messageText = decryptedMessages[message.id] || '';
            const isMatch = searchQuery && !isDeleted && messageText.toLowerCase().includes(searchQuery.toLowerCase());
            const isActive = activeMessageId === message.id;
            
            // Check if this is first message from this sender in a row
            const prevMessage = messages[index - 1];
            const showAvatar = !isOwn && (!prevMessage || prevMessage.senderId !== message.senderId);
            
            // Group reactions by emoji
            const groupedReactions = reactions.reduce((acc, reaction) => {
              if (!acc[reaction.emoji]) {
                acc[reaction.emoji] = [];
              }
              acc[reaction.emoji].push(reaction);
              return acc;
            }, {} as Record<string, typeof reactions>);

            return (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  isOwn ? "justify-end" : "justify-start",
                  "animate-fade-in"
                )}
                style={{ 
                  animationDelay: `${Math.min(index * 30, 300)}ms`,
                  animationFillMode: 'backwards'
                }}
              >
                <div 
                  className={cn(
                    "relative max-w-[85%] md:max-w-[70%]",
                    "transition-all duration-200"
                  )}
                  onTouchStart={() => setActiveMessageId(message.id)}
                  onTouchEnd={() => setTimeout(() => setActiveMessageId(null), 2000)}
                >
                  {/* Mobile-friendly action buttons - show on tap */}
                  {!isDeleted && isActive && (
                    <div className={cn(
                      "absolute -top-10 left-1/2 -translate-x-1/2",
                      "flex items-center gap-1 p-1.5 rounded-xl",
                      "bg-card/95 backdrop-blur-xl border border-border/50 shadow-lg",
                      "animate-scale-in z-20"
                    )}>
                      {isOwn && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-primary/10"
                            onClick={() => setEditingMessage({ id: message.id, text: decryptedMessages[message.id] || '' })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmId(message.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {onForwardMessage && contacts.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-primary/10"
                          onClick={() => setForwardingMessage({ id: message.id, text: decryptedMessages[message.id] || '' })}
                        >
                          <Forward className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Desktop hover buttons */}
                  {!isDeleted && (
                    <div className={cn(
                      "absolute top-1/2 -translate-y-1/2 hidden md:flex gap-0.5",
                      "opacity-0 group-hover:opacity-100 transition-all duration-200",
                      "p-1 rounded-lg bg-card/80 backdrop-blur-sm border border-border/30 shadow-sm",
                      isOwn ? "-left-24" : "-right-24"
                    )}>
                      {isOwn && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md hover:bg-primary/10"
                            onClick={() => setEditingMessage({ id: message.id, text: decryptedMessages[message.id] || '' })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmId(message.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {onForwardMessage && contacts.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md hover:bg-primary/10"
                          onClick={() => setForwardingMessage({ id: message.id, text: decryptedMessages[message.id] || '' })}
                        >
                          <Forward className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "group relative overflow-hidden",
                      "rounded-2xl px-3.5 py-2.5 md:px-4 md:py-3",
                      "transition-all duration-300 ease-out",
                      "active:scale-[0.98]",
                      isDeleted
                        ? "bg-muted/50 text-muted-foreground italic backdrop-blur-sm"
                        : isOwn
                          ? cn(
                              "bg-primary text-primary-foreground",
                              "rounded-br-md shadow-md shadow-primary/20",
                              "hover:shadow-lg hover:shadow-primary/30"
                            )
                          : cn(
                              "bg-card/80 backdrop-blur-sm text-card-foreground",
                              "border border-border/40 rounded-bl-md",
                              "hover:bg-card/90 hover:border-border/60"
                            ),
                      isMatch && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      isActive && !isDeleted && "scale-[1.02]"
                    )}
                  >
                    {/* Gradient shimmer effect for own messages */}
                    {isOwn && !isDeleted && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                    )}
                    
                    <div className="flex items-start gap-1.5 relative">
                      {message.encrypted && !isDeleted && (
                        <Lock className="h-3 w-3 opacity-40 shrink-0 mt-0.5" />
                      )}
                      <p className="break-words text-sm md:text-base leading-relaxed">
                        {decryptedMessages[message.id] || '...'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <p className={cn(
                          "text-[10px] md:text-xs",
                          isOwn ? "opacity-70" : "text-muted-foreground"
                        )}>
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {message.editedAt && !isDeleted && (
                          <span className={cn(
                            "text-[10px] md:text-xs",
                            isOwn ? "opacity-50" : "text-muted-foreground/70"
                          )}>(edited)</span>
                        )}
                        {isOwn && !isDeleted && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center ml-0.5">
                                {message.read ? (
                                  <CheckCheck className={cn(
                                    "h-3.5 w-3.5 transition-colors duration-300",
                                    "text-sky-300"
                                  )} />
                                ) : (
                                  <Check className="h-3.5 w-3.5 opacity-60" />
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              {message.read ? (
                                <p>
                                  Read {message.readAt ? new Date(message.readAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : ''}
                                </p>
                              ) : (
                                <p>Sent</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {!isDeleted && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <ReactionPicker onSelectReaction={(emoji) => onAddReaction(message.id, emoji)} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reactions display */}
                  {!isDeleted && Object.keys(groupedReactions).length > 0 && (
                    <div className={cn(
                      "flex gap-1 mt-1.5 flex-wrap",
                      isOwn ? "justify-end" : "justify-start"
                    )}>
                      {Object.entries(groupedReactions).map(([emoji, reactions]) => (
                        <Tooltip key={emoji}>
                          <TooltipTrigger asChild>
                            <button
                              className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full",
                                "bg-card/90 backdrop-blur-sm border border-border/50",
                                "hover:scale-110 hover:bg-card active:scale-95",
                                "transition-all duration-200 text-xs md:text-sm"
                              )}
                              onClick={() => onAddReaction(message.id, emoji)}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px] md:text-xs text-muted-foreground font-medium">
                                {reactions.length}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{reactions.map(r => r.userName).join(', ')}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Edit Message Dialog */}
      <Dialog open={!!editingMessage} onOpenChange={(open) => !open && setEditingMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
          </DialogHeader>
          <Input
            value={editingMessage?.text || ''}
            onChange={(e) => setEditingMessage(prev => prev ? { ...prev, text: e.target.value } : null)}
            onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>Cancel</Button>
            <Button onClick={handleEditSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to delete this message? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Forward Message Dialog */}
      <Dialog open={!!forwardingMessage} onOpenChange={(open) => {
        if (!open) {
          setForwardingMessage(null);
          setSelectedForwardContact(null);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Forward Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3 p-2 bg-muted rounded-lg">
              "{forwardingMessage?.text}"
            </p>
            <p className="text-sm font-medium">Select contact:</p>
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedForwardContact(contact.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                      selectedForwardContact === contact.id 
                        ? "bg-primary/10 border border-primary" 
                        : "hover:bg-accent"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={contact.photoURL} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {contact.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{contact.displayName}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setForwardingMessage(null);
              setSelectedForwardContact(null);
            }}>Cancel</Button>
            <Button onClick={handleForwardSubmit} disabled={!selectedForwardContact}>Forward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MessageList;
