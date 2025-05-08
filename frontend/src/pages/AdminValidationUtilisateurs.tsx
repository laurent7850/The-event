import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from 'utils/AuthContext'; 
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; 
import { useNavigate } from 'react-router-dom';
import AdminNavigation from 'components/AdminNavigation';
import brain from 'brain'; // Import the brain client
import { UserInfo } from 'types'; // Import the UserInfo type from brain data contracts

// Define an interface based on the UserInfo type from the brain client
// interface PendingUser extends UserInfo { 
//   // No need to extend if UserInfo from types.ts is sufficient
//   // Add any frontend specific fields if necessary, e.g., created_at if needed and not in UserInfo
// }

export default function AdminValidationUtilisateurs() {
  const [pendingUsers, setPendingUsers] = useState<UserInfo[]>([]); // Use UserInfo type
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null); // Track which user action is in progress

  const { user, loading: loadingAuth } = useAuth(); // Get user and loading state from context

  const fetchPendingUsers = useCallback(async () => {
    console.log("Fetching pending users using brain client...");
    setLoading(true);
    setError(null);
    try {
      // Use brain client to fetch pending users
      const response = await brain.validation_list_pending_users();
      
      if (response.status !== 200) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error ${response.status}`);
      }

      const data: UserInfo[] = await response.json();
      console.log("Received pending users:", data);
      setPendingUsers(data); // Set the users received from the API

    } catch (err: any) {
      console.error("Error fetching pending users via brain:", err);
      setError("Impossible de charger les utilisateurs en attente. " + err.message);
      toast.error("Erreur lors du chargement des utilisateurs: " + err.message);
      setPendingUsers([]); // Clear previous data on error
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Action Handlers using brain client --- 

  const handleApproveUser = useCallback(async (userId: string) => {
    setUpdatingUserId(userId);
    console.log(`Attempting to approve user ${userId} via brain client...`);
    try {
      const response = await brain.validation_approve_user({ user_id: userId });

      if (response.status !== 200) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error ${response.status}`);
      }

      const result = await response.json();
      toast.success(result.message || `Utilisateur ${userId} approuvé.`);
      fetchPendingUsers(); // Refresh the list

    } catch (err: any) {
      console.error(`Error approving user ${userId}:`, err);
      toast.error(`Erreur lors de l'approbation: ${err.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  }, [fetchPendingUsers]);

  const handleRejectUser = useCallback(async (userId: string) => {
    setUpdatingUserId(userId);
    console.log(`Attempting to reject user ${userId} via brain client...`);
    // Optional: Add confirmation dialog here if needed
    try {
      const response = await brain.validation_reject_user({ user_id: userId });

      if (response.status !== 200) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error ${response.status}`);
      }
      
      const result = await response.json();
      toast.success(result.message || `Utilisateur ${userId} rejeté.`);
      fetchPendingUsers(); // Refresh the list

    } catch (err: any) {
      console.error(`Error rejecting user ${userId}:`, err);
      toast.error(`Erreur lors du rejet: ${err.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  }, [fetchPendingUsers]);

  // Effect to check auth status and fetch data
  useEffect(() => {
    if (loadingAuth) {
      setLoading(true);
      setError(null);
      return;
    }

    if (!user) {
      setError("Non authentifié. Veuillez vous connecter.");
      setLoading(false);
      setPendingUsers([]); 
      return;
    }
    
    // Role check based on AuthContext user (assuming role is populated correctly)
    // Note: The actual API call is protected by the backend dependency
    if (user.role !== 'admin') {
       setError("Accès refusé. Cette page est réservée aux administrateurs.");
       setLoading(false);
       setPendingUsers([]); 
       return;
    }

    // If authenticated and appears to be admin on frontend, fetch pending users via backend
    setError(null);
    fetchPendingUsers();

  }, [user, loadingAuth, fetchPendingUsers]);

  return (
    <div className="container mx-auto p-4 md:p-8">
        <AdminNavigation /> 
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Validation des Utilisateurs</CardTitle>
                <CardDescription>
                    Validez ou refusez les nouvelles inscriptions de collaborateurs.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading && <p>Chargement des utilisateurs en attente...</p>}
                {error && <p className="text-destructive">Erreur: {error}</p>}
                {!loading && !error && pendingUsers.length === 0 && (
                    <p>Aucun utilisateur en attente de validation.</p>
                )}
                {!loading && !error && pendingUsers.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Prénom</TableHead>
                                <TableHead>Email</TableHead>
                                {/* Assuming UserInfo doesn't include created_at, remove this column or adjust API/type */}
                                {/* <TableHead>Date d'inscription</TableHead> */}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingUsers.map((pendingUser) => (
                                <TableRow key={pendingUser.id}>
                                    <TableCell>{pendingUser.nom ?? '-'}</TableCell>
                                    <TableCell>{pendingUser.prenom ?? '-'}</TableCell>
                                    <TableCell>{pendingUser.email ?? '-'}</TableCell>
                                    {/* <TableCell>{new Date(pendingUser.created_at).toLocaleDateString()}</TableCell> */}
                                    <TableCell className="text-right space-x-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => handleApproveUser(pendingUser.id)} 
                                            disabled={updatingUserId === pendingUser.id} 
                                        >
                                            {updatingUserId === pendingUser.id ? 'Validation...' : 'Valider'}
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="destructive" 
                                            onClick={() => handleRejectUser(pendingUser.id)} 
                                            disabled={updatingUserId === pendingUser.id} 
                                        >
                                            {updatingUserId === pendingUser.id ? 'Rejet...' : 'Refuser'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
