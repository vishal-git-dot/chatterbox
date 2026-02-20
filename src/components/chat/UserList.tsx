import { useState } from 'react';
import { User } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Ban, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLastSeen } from '@/lib/formatLastSeen';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserListProps {
  users: User[];
  selectedUserId?: string;
  onSelectUser: (userId: string) => void;
  onAddUser: (email: string) => void;
  onBlockUser?: (userId: string) => void;
  unreadCounts?: Record<string, number>;
  blockedUserIds?: string[];
  acceptedContactIds?: string[];
}

const UserList = ({ 
  users, 
  selectedUserId, 
  onSelectUser, 
  onAddUser, 
  onBlockUser,
  unreadCounts = {},
  blockedUserIds = [],
  acceptedContactIds = []
}: UserListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');

  // Only show accepted contacts, filter out blocked users
  const visibleUsers = users.filter(user => 
    acceptedContactIds.includes(user.id) && !blockedUserIds.includes(user.id)
  );

  const filteredUsers = visibleUsers.filter(user =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = () => {
    const trimmed = newUserEmail.trim();
    if (trimmed && (trimmed.includes('@') || trimmed.length >= 3)) {
      onAddUser(trimmed);
      setNewUserEmail('');
      setIsAddingUser(false);
      setSearchQuery('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-card/50 backdrop-blur-sm">
      {/* Search and Add Contact Header */}
      <div className="p-3 border-b border-border/30 space-y-2.5">
        <div className="relative group">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
            "text-muted-foreground transition-colors duration-200",
            "group-focus-within:text-primary"
          )} />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-9 h-10 rounded-xl",
              "bg-background/60 border-border/40",
              "focus:bg-background focus:border-primary/50",
              "transition-all duration-200"
            )}
          />
        </div>
        {isAddingUser ? (
          <div className="space-y-2 animate-fade-in">
            <div className="flex gap-2">
              <Input
                placeholder="Email or username..."
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
                autoFocus
                maxLength={255}
                className="h-9 rounded-lg text-sm"
              />
              <Button size="sm" onClick={handleAddUser} className="rounded-lg px-4">Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAddingUser(false)} className="rounded-lg">
                Cancel
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground px-1">
              Enter an email or username to send a contact request
            </p>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "w-full h-9 rounded-xl",
              "bg-primary/5 border-primary/20 text-primary",
              "hover:bg-primary/10 hover:border-primary/30",
              "active:scale-[0.98] transition-all duration-200"
            )}
            onClick={() => setIsAddingUser(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add New Contact
          </Button>
        )}
      </div>
      
      {/* Contacts List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 px-4 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                {acceptedContactIds.length === 0 
                  ? "No contacts yet"
                  : "No contacts found"
                }
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Add contacts to start chatting
              </p>
            </div>
          ) : (
            filteredUsers.map((user, index) => (
              <div
                key={user.id}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl",
                  "transition-all duration-200 ease-out",
                  "hover:bg-accent/40 active:scale-[0.98]",
                  selectedUserId === user.id && "bg-accent/60 shadow-sm"
                )}
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards'
                }}
              >
                <button
                  onClick={() => onSelectUser(user.id)}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="relative">
                    <Avatar className={cn(
                      "h-11 w-11 ring-2 ring-transparent",
                      "transition-all duration-300",
                      "hover:ring-primary/30 hover:scale-105",
                      selectedUserId === user.id && "ring-primary/40"
                    )}>
                      <AvatarImage src={user.photoURL} alt={user.displayName} />
                      <AvatarFallback className={cn(
                        "bg-gradient-to-br from-primary/20 to-accent/20",
                        "text-primary font-semibold text-sm"
                      )}>
                        {user.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full",
                        "border-2 border-card shadow-sm",
                        "transition-colors duration-300",
                        user.status === 'online' && "bg-emerald-500",
                        user.status === 'away' && "bg-amber-500",
                        user.status === 'offline' && "bg-muted-foreground/40"
                      )}
                    />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate text-sm">{user.displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {user.status === 'online' ? (
                        <span className="text-emerald-500 font-medium">Online</span>
                      ) : user.status === 'away' ? (
                        <span className="text-amber-500">Away</span>
                      ) : (
                        <span>{formatLastSeen(user.lastSeen)}</span>
                      )}
                    </p>
                  </div>
                  {unreadCounts[user.id] > 0 && (
                    <span className={cn(
                      "min-w-[22px] h-[22px] px-1.5 rounded-full",
                      "bg-primary text-primary-foreground",
                      "text-[11px] font-bold",
                      "flex items-center justify-center",
                      "animate-scale-in shadow-md shadow-primary/30"
                    )}>
                      {unreadCounts[user.id] > 99 ? '99+' : unreadCounts[user.id]}
                    </span>
                  )}
                </button>
                {onBlockUser && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "h-8 w-8 shrink-0 rounded-lg",
                          "opacity-0 group-hover:opacity-100",
                          "hover:bg-muted transition-all duration-200"
                        )}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="rounded-xl shadow-lg border-border/50 bg-card/95 backdrop-blur-xl"
                    >
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive rounded-lg cursor-pointer"
                        onClick={() => onBlockUser(user.id)}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Block User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default UserList;
