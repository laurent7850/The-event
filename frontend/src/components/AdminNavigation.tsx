import { NavLink } from "react-router-dom";
import {
  Users, // Existing icon
  ClipboardList, // Existing icon
  Briefcase, // Existing icon
  FileText, // Existing icon
  UserCheck, // Icon for User Validation
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface AdminNavigationProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function AdminNavigation({ className, ...props }: AdminNavigationProps) {
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      buttonVariants({ variant: isActive ? "secondary" : "ghost" }),
      "w-full justify-start",
      !isActive && "text-muted-foreground",
    );

  return (
    <div className={cn("pb-12 w-64 border-r bg-background", className)} {...props}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Administration
          </h2>
          <div className="space-y-1">
            <NavLink to="/admin-validation-utilisateurs" className={getNavLinkClass}>
              <UserCheck className="mr-2 h-4 w-4" />
              Validation Utilisateurs
            </NavLink>
            <NavLink to="/admin-validation-prestations" className={getNavLinkClass}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Validation Prestations
            </NavLink>
            {/* Separate Links for Clients and Projects */}
             <NavLink to="/AdminClients" className={getNavLinkClass}>
               <Briefcase className="mr-2 h-4 w-4" />
               Gestion Clients
             </NavLink>
             <NavLink to="/ProjectManagement" className={getNavLinkClass}>
               {/* Assuming a Briefcase or similar icon is okay for projects too */}
               <Briefcase className="mr-2 h-4 w-4" />
               Gestion Projets
             </NavLink>
            <NavLink to="/admin-invoicing" className={getNavLinkClass}>
              <FileText className="mr-2 h-4 w-4" />
              Génération Factures
            </NavLink>

          </div>
        </div>
      </div>
    </div>
  );
}
