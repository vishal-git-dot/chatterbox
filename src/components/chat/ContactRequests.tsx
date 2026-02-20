import { User, ContactRequest } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, X, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContactRequestsProps {
  requests: ContactRequest[];
  users: User[];
  onAccept: (requestId: string, fromUserId: string) => void;
  onDecline: (requestId: string) => void;
}

const ContactRequests = ({ requests, users, onAccept, onDecline }: ContactRequestsProps) => {
  if (requests.length === 0) return null;

  return (
    <Card className="mx-2 mb-2 p-3 bg-primary/5 border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Contact Requests</h3>
        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
          {requests.length}
        </span>
      </div>
      <ScrollArea className="max-h-40">
        <div className="space-y-2">
          {requests.map((request) => {
            const user = users.find(u => u.id === request.fromUserId);
            if (!user) return null;

            return (
              <div
                key={request.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-background/50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {user.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">wants to chat</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                    onClick={() => onAccept(request.id, request.fromUserId)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDecline(request.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default ContactRequests;
