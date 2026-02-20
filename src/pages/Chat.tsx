import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, push, onValue, update, set, onDisconnect, remove } from 'firebase/database';
import { database } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/hooks/useNotifications';
import { User, Message, Reaction, ContactRequest } from '@/types/chat';
import UserList from '@/components/chat/UserList';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ContactRequests from '@/components/chat/ContactRequests';
import BlockedUsers from '@/components/chat/BlockedUsers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, UserCircle, Moon, Sun, Bell, BellOff, Search, X, ArrowLeft, Menu, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { encryptMessage } from '@/lib/encryption';
import { formatLastSeen } from '@/lib/formatLastSeen';

const Chat = () => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { permission, requestPermission, showNotification } = useNotifications();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [viewingUsers, setViewingUsers] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [acceptedContactIds, setAcceptedContactIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<ContactRequest[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);

  // Listen to all users from Firebase
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const usersRef = ref(database, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val();
      if (usersData) {
        const usersList = Object.values(usersData) as User[];
        setUsers(usersList.filter(u => u.id !== currentUser.id));
      }
    });

    return () => unsubscribeUsers();
  }, [currentUser, navigate]);

  // Store blocked entries with their keys for unblock functionality
  const [blockedEntries, setBlockedEntries] = useState<Record<string, string>>({});

  // Listen to blocked users
  useEffect(() => {
    if (!currentUser) return;

    const blockedRef = ref(database, `blocked/${currentUser.id}`);
    const unsubscribe = onValue(blockedRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entries: Record<string, string> = {};
        Object.entries(data).forEach(([key, val]: [string, any]) => {
          entries[val.blockedUserId] = key;
        });
        setBlockedEntries(entries);
        setBlockedUserIds(Object.keys(entries));
      } else {
        setBlockedEntries({});
        setBlockedUserIds([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen to accepted contacts
  useEffect(() => {
    if (!currentUser) return;

    const contactsRef = ref(database, `contacts/${currentUser.id}`);
    const unsubscribe = onValue(contactsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAcceptedContactIds(Object.keys(data));
      } else {
        setAcceptedContactIds([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen for unblock notifications
  useEffect(() => {
    if (!currentUser) return;

    const notificationsRef = ref(database, `notifications/${currentUser.id}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([key, notification]: [string, any]) => {
          if (notification.type === 'unblocked' && !notification.read) {
            toast.info(`${notification.fromUserName} has unblocked you. You can now message them again!`);
            showNotification('You have been unblocked', {
              body: `${notification.fromUserName} has unblocked you. You can now message them again!`,
            });
            // Mark notification as read
            const notificationRef = ref(database, `notifications/${currentUser.id}/${key}`);
            update(notificationRef, { read: true });
          }
        });
      }
    });

    return () => unsubscribe();
  }, [currentUser, showNotification]);

  // Listen to pending contact requests
  useEffect(() => {
    if (!currentUser) return;

    const requestsRef = ref(database, 'contactRequests');
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const requests: ContactRequest[] = Object.entries(data)
          .map(([id, req]: [string, any]) => ({ ...req, id }))
          .filter((req: ContactRequest) => 
            req.toUserId === currentUser.id && req.status === 'pending'
          );
        setPendingRequests(requests);
      } else {
        setPendingRequests([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen to messages between current user and selected user
  useEffect(() => {
    if (!currentUser || !selectedUserId) return;

    const chatId = [currentUser.id, selectedUserId].sort().join('_');
    const messagesRef = ref(database, `messages/${chatId}`);
    
    const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
      const messagesData = snapshot.val();
      if (messagesData) {
        const messagesList = Object.entries(messagesData).map(([id, msg]: [string, any]) => ({
          ...msg,
          id
        })) as Message[];
        setMessages(messagesList.sort((a, b) => a.timestamp - b.timestamp));
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribeMessages();
  }, [currentUser, selectedUserId]);

  // Mark messages as read when viewing the chat
  useEffect(() => {
    if (!currentUser || !selectedUserId || messages.length === 0) return;

    const chatId = [currentUser.id, selectedUserId].sort().join('_');
    const unreadMessages = messages.filter(
      msg => msg.senderId === selectedUserId && !msg.read
    );

    unreadMessages.forEach(async (msg) => {
      const messageRef = ref(database, `messages/${chatId}/${msg.id}`);
      await update(messageRef, { read: true, readAt: Date.now() });
    });
  }, [currentUser, selectedUserId, messages]);

  // Listen to typing indicators
  useEffect(() => {
    if (!currentUser || !selectedUserId) return;

    const typingRef = ref(database, `typing/${selectedUserId}_${currentUser.id}`);
    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      const isTyping = snapshot.val();
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) {
          next.add(selectedUserId);
        } else {
          next.delete(selectedUserId);
        }
        return next;
      });
    });

    return () => unsubscribeTyping();
  }, [currentUser, selectedUserId]);

  // Viewing indicator
  useEffect(() => {
    if (!currentUser || !selectedUserId) return;

    const viewingRef = ref(database, `viewing/${currentUser.id}_${selectedUserId}`);
    set(viewingRef, true);
    onDisconnect(viewingRef).set(false);

    const theirViewingRef = ref(database, `viewing/${selectedUserId}_${currentUser.id}`);
    const unsubscribeViewing = onValue(theirViewingRef, (snapshot) => {
      const isViewing = snapshot.val();
      setViewingUsers(prev => {
        const next = new Set(prev);
        if (isViewing) {
          next.add(selectedUserId);
        } else {
          next.delete(selectedUserId);
        }
        return next;
      });
    });

    return () => {
      set(viewingRef, false);
      unsubscribeViewing();
    };
  }, [currentUser, selectedUserId]);

  const [seenMessageIds, setSeenMessageIds] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Listen for new messages from ALL users (global listener)
  useEffect(() => {
    if (!currentUser) return;

    const allMessagesRef = ref(database, 'messages');
    const unsubscribe = onValue(allMessagesRef, (snapshot) => {
      const allChats = snapshot.val();
      if (!allChats) return;

      const newUnreadCounts: Record<string, number> = {};
      
      Object.entries(allChats).forEach(([chatId, messagesData]: [string, any]) => {
        const [userId1, userId2] = chatId.split('_');
        if (userId1 !== currentUser.id && userId2 !== currentUser.id) return;
        
        const otherUserId = userId1 === currentUser.id ? userId2 : userId1;
        
        // Skip blocked users
        if (blockedUserIds.includes(otherUserId)) return;
        
        Object.entries(messagesData).forEach(([msgId, msg]: [string, any]) => {
          if (msg.senderId !== currentUser.id && !msg.read && !msg.deleted) {
            newUnreadCounts[otherUserId] = (newUnreadCounts[otherUserId] || 0) + 1;
            
            if (!seenMessageIds.has(msgId)) {
              const sender = users.find(u => u.id === msg.senderId);
              
              if (sender && selectedUserId !== msg.senderId && acceptedContactIds.includes(msg.senderId)) {
                showNotification(`New message from ${sender.displayName}`, {
                  body: '🔒 Encrypted message',
                  tag: msg.senderId,
                });
                
                toast.info(`New message from ${sender.displayName}`, {
                  action: {
                    label: 'View',
                    onClick: () => setSelectedUserId(msg.senderId)
                  }
                });
              }
              
              setSeenMessageIds(prev => new Set(prev).add(msgId));
            }
          }
        });
      });
      
      setUnreadCounts(newUnreadCounts);
    });

    return () => unsubscribe();
  }, [currentUser, selectedUserId, users, showNotification, seenMessageIds, blockedUserIds, acceptedContactIds]);

  const handleSendMessage = async (text: string) => {
    if (!selectedUserId || !currentUser) return;

    // Input validation
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 5000) {
      toast.error('Message must be between 1 and 5000 characters');
      return;
    }

    // Check if this is a first-time message (contact request)
    const isContact = acceptedContactIds.includes(selectedUserId);
    
    if (!isContact) {
      // Send contact request instead
      const requestsRef = ref(database, 'contactRequests');
      await push(requestsRef, {
        fromUserId: currentUser.id,
        toUserId: selectedUserId,
        status: 'pending',
        timestamp: Date.now()
      });
      toast.info('Contact request sent! They need to accept before you can chat.');
      return;
    }

    try {
      const chatId = [currentUser.id, selectedUserId].sort().join('_');
      const encryptedText = await encryptMessage(trimmed, chatId);
      const messagesRef = ref(database, `messages/${chatId}`);

      await push(messagesRef, {
        senderId: currentUser.id,
        receiverId: selectedUserId,
        text: encryptedText,
        timestamp: Date.now(),
        read: false,
        reactions: [],
        encrypted: true
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!currentUser || !selectedUserId) return;

    const chatId = [currentUser.id, selectedUserId].sort().join('_');
    const messageRef = ref(database, `messages/${chatId}/${messageId}`);

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const reactions = message.reactions || [];
    const existingReaction = reactions.find(
      r => r.userId === currentUser.id && r.emoji === emoji
    );

    let newReactions: Reaction[];
    if (existingReaction) {
      newReactions = reactions.filter(r => !(r.userId === currentUser.id && r.emoji === emoji));
    } else {
      const newReaction: Reaction = {
        emoji,
        userId: currentUser.id,
        userName: currentUser.displayName
      };
      newReactions = [...reactions, newReaction];
    }

    await update(messageRef, { reactions: newReactions });
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!currentUser || !selectedUserId) return;

    // Authorization: verify the message belongs to the current user
    const message = messages.find(m => m.id === messageId);
    if (!message || message.senderId !== currentUser.id) {
      toast.error('You can only edit your own messages');
      return;
    }

    // Input validation
    const trimmed = newText.trim();
    if (!trimmed || trimmed.length > 5000) {
      toast.error('Message must be between 1 and 5000 characters');
      return;
    }

    try {
      const chatId = [currentUser.id, selectedUserId].sort().join('_');
      const encryptedText = await encryptMessage(trimmed, chatId);
      const messageRef = ref(database, `messages/${chatId}/${messageId}`);
      
      await update(messageRef, { 
        text: encryptedText, 
        editedAt: Date.now(),
        encrypted: true
      });
      toast.success('Message updated');
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser || !selectedUserId) return;

    // Authorization: verify the message belongs to the current user
    const message = messages.find(m => m.id === messageId);
    if (!message || message.senderId !== currentUser.id) {
      toast.error('You can only delete your own messages');
      return;
    }

    try {
      const chatId = [currentUser.id, selectedUserId].sort().join('_');
      const messageRef = ref(database, `messages/${chatId}/${messageId}`);
      
      await update(messageRef, { 
        deleted: true,
        text: '',
        reactions: []
      });
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleForwardMessage = async (messageText: string, toUserId: string) => {
    if (!currentUser) return;

    try {
      const chatId = [currentUser.id, toUserId].sort().join('_');
      const forwardedText = `↪️ Forwarded: ${messageText}`;
      const encryptedText = await encryptMessage(forwardedText, chatId);
      const messagesRef = ref(database, `messages/${chatId}`);

      await push(messagesRef, {
        senderId: currentUser.id,
        receiverId: toUserId,
        text: encryptedText,
        timestamp: Date.now(),
        read: false,
        reactions: [],
        encrypted: true
      });

      const user = users.find(u => u.id === toUserId);
      toast.success(`Message forwarded to ${user?.displayName || 'contact'}`);
    } catch (error) {
      console.error('Failed to forward message:', error);
      toast.error('Failed to forward message');
    }
  };

  const handleTyping = async (isTyping: boolean) => {
    if (!currentUser || !selectedUserId) return;

    const typingRef = ref(database, `typing/${currentUser.id}_${selectedUserId}`);
    await set(typingRef, isTyping);

    if (isTyping) {
      setTimeout(() => {
        set(typingRef, false);
      }, 3000);
    }
  };

  const handleAddUser = async (identifier: string) => {
    if (!currentUser || !identifier || identifier.length < 3 || identifier.length > 255) {
      toast.error('Please enter a valid email or username (3-255 characters)');
      return;
    }

    const isEmail = identifier.includes('@');
    const foundUser = users.find(u => 
      isEmail ? u.email === identifier : u.displayName.toLowerCase() === identifier.toLowerCase()
    );
    
    if (!foundUser) {
      toast.error('User not found. They need to sign up first.');
      return;
    }

    if (blockedUserIds.includes(foundUser.id)) {
      toast.error('You have blocked this user.');
      return;
    }

    if (acceptedContactIds.includes(foundUser.id)) {
      setSelectedUserId(foundUser.id);
      toast.info('User is already in your contacts');
      return;
    }

    // Send contact request
    const requestsRef = ref(database, 'contactRequests');
    await push(requestsRef, {
      fromUserId: currentUser.id,
      toUserId: foundUser.id,
      status: 'pending',
      timestamp: Date.now()
    });
    toast.success(`Contact request sent to ${foundUser.displayName}`);
  };

  const handleAcceptRequest = async (requestId: string, fromUserId: string) => {
    if (!currentUser) return;

    // Add to both users' contacts
    const myContactRef = ref(database, `contacts/${currentUser.id}/${fromUserId}`);
    const theirContactRef = ref(database, `contacts/${fromUserId}/${currentUser.id}`);
    
    await set(myContactRef, { addedAt: Date.now() });
    await set(theirContactRef, { addedAt: Date.now() });

    // Update request status
    const requestRef = ref(database, `contactRequests/${requestId}`);
    await update(requestRef, { status: 'accepted' });

    const user = users.find(u => u.id === fromUserId);
    toast.success(`${user?.displayName || 'User'} added to contacts!`);
  };

  const handleDeclineRequest = async (requestId: string) => {
    const requestRef = ref(database, `contactRequests/${requestId}`);
    await update(requestRef, { status: 'declined' });
    toast.info('Contact request declined');
  };

  const handleBlockUser = async (userId: string) => {
    if (!currentUser) return;

    const blockedRef = ref(database, `blocked/${currentUser.id}`);
    await push(blockedRef, {
      blockedUserId: userId,
      blockedBy: currentUser.id,
      timestamp: Date.now()
    });

    // Remove from contacts
    const contactRef = ref(database, `contacts/${currentUser.id}/${userId}`);
    await remove(contactRef);

    if (selectedUserId === userId) {
      setSelectedUserId(undefined);
    }

    const user = users.find(u => u.id === userId);
    toast.success(`${user?.displayName || 'User'} has been blocked`);
  };

  const handleUnblockUser = async (userId: string) => {
    if (!currentUser) return;

    const entryKey = blockedEntries[userId];
    if (entryKey) {
      const blockedRef = ref(database, `blocked/${currentUser.id}/${entryKey}`);
      await remove(blockedRef);
      
      // Restore contact relationship for both users
      const myContactRef = ref(database, `contacts/${currentUser.id}/${userId}`);
      const theirContactRef = ref(database, `contacts/${userId}/${currentUser.id}`);
      
      await set(myContactRef, {
        acceptedAt: Date.now(),
        status: 'accepted'
      });
      
      await set(theirContactRef, {
        acceptedAt: Date.now(),
        status: 'accepted'
      });
      
      // Send notification to the unblocked user
      const notificationsRef = ref(database, `notifications/${userId}`);
      await push(notificationsRef, {
        type: 'unblocked',
        fromUserId: currentUser.id,
        fromUserName: currentUser.displayName,
        timestamp: Date.now(),
        read: false
      });
      
      const user = users.find(u => u.id === userId);
      toast.success(`${user?.displayName || 'User'} has been unblocked and contact restored`);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const selectedUser = users.find(u => u.id === selectedUserId);
  const isSelectedUserContact = selectedUserId ? acceptedContactIds.includes(selectedUserId) : false;

  // Handle mobile user selection
  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowSidebar(false);
  };

  // Handle back to sidebar on mobile
  const handleBackToSidebar = () => {
    setShowSidebar(true);
    setSelectedUserId(undefined);
  };

  return (
    <div className="h-screen flex relative overflow-hidden bg-background">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[image:var(--gradient-primary)] opacity-30 animate-gradient-slow" />
      <div className="absolute inset-0 bg-background/85 backdrop-blur-3xl" />
      
      {/* Decorative blobs */}
      <div className="absolute top-0 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-0 -right-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
      
      {/* Sidebar */}
      <Card className={cn(
        "w-full md:w-80 lg:w-96 border-r border-border/30 rounded-none",
        "flex flex-col relative z-10",
        "bg-card/80 backdrop-blur-2xl",
        "transition-all duration-500 ease-out",
        !showSidebar ? 'hidden md:flex' : 'flex'
      )}>
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-border/30 bg-card/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative">
                <Avatar className={cn(
                  "w-10 h-10 md:w-11 md:h-11 ring-2 ring-primary/20",
                  "transition-all duration-300 hover:ring-primary/40 hover:scale-105"
                )}>
                  <AvatarImage src={currentUser?.photoURL} alt={currentUser?.displayName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
                    {currentUser?.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(
                  "absolute bottom-0 right-0 w-3 h-3 rounded-full",
                  "border-2 border-card bg-emerald-500 shadow-sm"
                )} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate text-sm md:text-base">{currentUser?.displayName}</p>
                <p className="text-[11px] text-emerald-500 font-medium">Online</p>
              </div>
            </div>
            <div className="flex gap-0.5 flex-shrink-0">
              <BlockedUsers
                blockedUserIds={blockedUserIds}
                users={users}
                onUnblock={handleUnblockUser}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={permission === 'granted' ? undefined : requestPermission}
                className={cn(
                  "h-9 w-9 rounded-xl",
                  "hover:bg-primary/10 active:scale-95",
                  "transition-all duration-200"
                )}
                title={permission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
              >
                {permission === 'granted' ? 
                  <Bell className="h-4 w-4 text-primary" /> : 
                  <BellOff className="h-4 w-4 opacity-50" />
                }
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 rounded-xl hover:bg-primary/10 active:scale-95 transition-all duration-200"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/profile')}
                className="h-9 w-9 rounded-xl hover:bg-primary/10 active:scale-95 transition-all duration-200"
              >
                <UserCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Contact Requests */}
        <ContactRequests
          requests={pendingRequests}
          users={users}
          onAccept={handleAcceptRequest}
          onDecline={handleDeclineRequest}
        />
        
        <UserList
          users={users}
          selectedUserId={selectedUserId}
          onSelectUser={handleSelectUser}
          onAddUser={handleAddUser}
          onBlockUser={handleBlockUser}
          unreadCounts={unreadCounts}
          blockedUserIds={blockedUserIds}
          acceptedContactIds={acceptedContactIds}
        />
      </Card>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col relative z-10",
        "transition-all duration-500 ease-out",
        showSidebar ? 'hidden md:flex' : 'flex'
      )}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className={cn(
              "p-3 md:p-4 border-b border-border/30",
              "bg-card/60 backdrop-blur-2xl",
              "transition-all duration-300"
            )}>
              <div className="flex items-center justify-between gap-2 md:gap-3">
                <div className="flex items-center gap-2.5 md:gap-3 flex-1 min-w-0">
                  {/* Back button for mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBackToSidebar}
                    className="md:hidden h-9 w-9 rounded-xl shrink-0 hover:bg-primary/10 active:scale-95 transition-all duration-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="relative">
                    <Avatar className={cn(
                      "w-10 h-10 md:w-11 md:h-11 ring-2 ring-transparent",
                      "transition-all duration-300 hover:ring-primary/30 hover:scale-105"
                    )}>
                      <AvatarImage src={selectedUser.photoURL} alt={selectedUser.displayName} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
                        {selectedUser.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full",
                        "border-2 border-card shadow-sm transition-colors duration-300",
                        selectedUser.status === 'online' && "bg-emerald-500",
                        selectedUser.status === 'away' && "bg-amber-500",
                        selectedUser.status === 'offline' && "bg-muted-foreground/40"
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm md:text-base truncate">{selectedUser.displayName}</p>
                    <p className="text-[11px] md:text-xs truncate">
                      {!isSelectedUserContact ? (
                        <span className="text-amber-500 font-medium">Pending contact request</span>
                      ) : typingUsers.has(selectedUserId!) ? (
                        <span className="text-primary font-medium animate-pulse">typing...</span>
                      ) : viewingUsers.has(selectedUserId!) ? (
                        <span className="text-muted-foreground">viewing chat</span>
                      ) : selectedUser.status === 'online' ? (
                        <span className="text-emerald-500 font-medium">Online</span>
                      ) : selectedUser.status === 'away' ? (
                        <span className="text-amber-500">Away</span>
                      ) : (
                        <span className="text-muted-foreground">{formatLastSeen(selectedUser.lastSeen)}</span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Search toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsSearchOpen(!isSearchOpen);
                    if (isSearchOpen) setSearchQuery('');
                  }}
                  className={cn(
                    "h-9 w-9 rounded-xl",
                    "hover:bg-primary/10 active:scale-95",
                    "transition-all duration-200",
                    isSearchOpen && "bg-primary/10 text-primary"
                  )}
                >
                  {isSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Search input */}
              {isSearchOpen && (
                <div className="mt-3 animate-fade-in">
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 rounded-xl bg-background/60 border-border/40 focus:bg-background"
                    autoFocus
                  />
                  {searchQuery && (
                    <p className="text-[11px] text-muted-foreground mt-2 px-1">
                      Search results shown below (encrypted messages searched after decryption)
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Messages */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-transparent to-background/50">
              <MessageList 
                messages={messages}
                chatId={[currentUser!.id, selectedUserId!].sort().join('_')}
                onAddReaction={handleAddReaction}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onForwardMessage={handleForwardMessage}
                searchQuery={searchQuery}
                contacts={users.filter(u => acceptedContactIds.includes(u.id) && !blockedUserIds.includes(u.id) && u.id !== selectedUserId)}
              />
            </div>
            
            {typingUsers.has(selectedUserId!) && selectedUser && (
              <TypingIndicator userName={selectedUser.displayName} />
            )}
            <MessageInput 
              onSendMessage={handleSendMessage} 
              onTyping={handleTyping}
              placeholder={isSelectedUserContact ? "Type a message..." : "Send a message to request contact..."}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center animate-fade-in max-w-xs">
              <div className={cn(
                "w-20 h-20 mx-auto mb-6 rounded-3xl",
                "bg-gradient-to-br from-primary/10 to-accent/10",
                "flex items-center justify-center",
                "shadow-lg shadow-primary/5"
              )}>
                <Send className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Start a conversation</h3>
              <p className="text-sm text-muted-foreground">
                Select a contact from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
