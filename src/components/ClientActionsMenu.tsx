import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, ExternalLink, ArrowRightLeft } from "lucide-react";
import { MoveClientDialog } from "./MoveClientDialog";
import { DbClient } from "@/hooks/useClients";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientActionsMenuProps {
  client: DbClient;
}

export const ClientActionsMenu = ({ client }: ClientActionsMenuProps) => {
  const navigate = useNavigate();
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title="Aktionen"
            aria-label="Aktionen"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/clients/${client.id}`);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Zum Unternehmen
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setMoveDialogOpen(true);
            }}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Verschieben
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MoveClientDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        client={client}
      />
    </>
  );
};
