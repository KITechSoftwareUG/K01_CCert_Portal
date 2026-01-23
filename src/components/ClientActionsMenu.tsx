import { useNavigate } from "react-router-dom";
import { MoreHorizontal, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientActionsMenuProps {
  clientId: string;
}

export const ClientActionsMenu = ({ clientId }: ClientActionsMenuProps) => {
  const navigate = useNavigate();

  return (
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
            navigate(`/clients/${clientId}`);
          }}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Zum Unternehmen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
