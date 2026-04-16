/**
 * Creator Collaborators Page
 * Location: src/pages/creator/CreatorCollaboratorsPage.tsx
 * 
 * Manage creator collaborators and revenue split percentages
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  useGetCollaborators,
  useAddCollaborator,
  useRemoveCollaborator,
  useUpdateCollaboratorShare,
} from '@/hooks/usePayoutStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Slider } from '@/components/ui/slider';
import { Users, Plus, Trash2, AlertCircle, Check } from 'lucide-react';

interface Collaborator {
  id: string;
  address: string;
  name?: string;
  share: number;
  earnings: number;
  joinedAt: string;
  verified: boolean;
}

export function CreatorCollaboratorsPage() {
  const { address } = useAccount();
  const [newCollaboratorAddress, setNewCollaboratorAddress] = useState('');
  const [newCollaboratorShare, setNewCollaboratorShare] = useState([10]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingShare, setEditingShare] = useState([0]);

  const { data: collaborators, isLoading } = useGetCollaborators(address || '0x0');
  const { mutate: addCollaborator, isLoading: isAdding } = useAddCollaborator();
  const { mutate: removeCollaborator } = useRemoveCollaborator();
  const { mutate: updateShare } = useUpdateCollaboratorShare();

  if (!address) {
    return (
      <div className="space-y-4 p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Connect your wallet to manage collaborators</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalShare = (collaborators || []).reduce(
    (sum: number, c: Collaborator) => sum + c.share,
    0
  );
  const yourShare = Math.max(0, 100 - totalShare);

  const handleAddCollaborator = () => {
    if (!newCollaboratorAddress || newCollaboratorShare[0] === 0) return;

    addCollaborator(
      {
        collaboratorAddress: newCollaboratorAddress,
        sharePercentage: newCollaboratorShare[0],
      },
      {
        onSuccess: () => {
          setNewCollaboratorAddress('');
          setNewCollaboratorShare([10]);
        },
      }
    );
  };

  const handleUpdateShare = (collabId: string) => {
    updateShare({
      collaboratorId: collabId,
      newShare: editingShare[0],
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Collaborators</h1>
        <p className="text-gray-600">
          Manage revenue splits and collaborator permissions
        </p>
      </div>

      {/* Revenue Distribution Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Your Share */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Your Share</span>
                <span className="font-bold text-lg">{yourShare}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${yourShare}%` }}
                />
              </div>
            </div>

            {/* Collaborator Shares */}
            {(collaborators || []).map((collab: Collaborator) => (
              <div key={collab.id}>
                <div className="flex justify-between mb-2 items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {collab.name || collab.address.slice(0, 6)}...
                      {collab.address.slice(-4)}
                    </span>
                    {collab.verified && (
                      <Badge className="bg-green-600 text-xs">
                        <Check className="w-3 h-3" />
                      </Badge>
                    )}
                  </div>
                  <span className="font-bold text-lg">{collab.share}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${collab.share}%` }}
                  />
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="pt-4 border-t">
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{totalShare + yourShare}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collaborators List */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {(collaborators || []).length} Collaborators
          </CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Collaborator
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Collaborator</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div>
                  <label className="text-sm font-semibold block mb-2">
                    Wallet Address
                  </label>
                  <Input
                    placeholder="0x..."
                    value={newCollaboratorAddress}
                    onChange={(e) => setNewCollaboratorAddress(e.target.value)}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    The wallet address of the collaborator
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-2">
                    Revenue Share: {newCollaboratorShare[0]}%
                  </label>
                  <Slider
                    min={1}
                    max={Math.min(99, yourShare + 50)}
                    step={1}
                    value={newCollaboratorShare}
                    onValueChange={setNewCollaboratorShare}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    You will retain {Math.max(0, 100 - (totalShare + newCollaboratorShare[0]))}%
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-900">
                    The collaborator will receive {newCollaboratorShare[0]}% of all future
                    earnings from your creations.
                  </p>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setNewCollaboratorAddress('')}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={
                      isAdding ||
                      !newCollaboratorAddress ||
                      newCollaboratorShare[0] === 0
                    }
                    onClick={handleAddCollaborator}
                  >
                    {isAdding ? 'Adding...' : 'Add Collaborator'}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded" />
              ))}
            </div>
          ) : (collaborators || []).length > 0 ? (
            <div className="space-y-3 divide-y">
              {(collaborators || []).map((collab: Collaborator) => (
                <div key={collab.id} className="py-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">
                          {collab.name || `${collab.address.slice(0, 6)}...${collab.address.slice(-4)}`}
                        </p>
                        {collab.verified && (
                          <Badge className="bg-green-600 text-xs">
                            <Check className="w-3 h-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        Joined {new Date(collab.joinedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right mr-4">
                      <p className="text-2xl font-bold">{collab.share}%</p>
                      <p className="text-xs text-gray-600">
                        {collab.earnings} ETH earned
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Dialog
                        open={editingId === collab.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setEditingId(collab.id);
                            setEditingShare([collab.share]);
                          } else {
                            setEditingId(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Revenue Share</DialogTitle>
                          </DialogHeader>

                          <div className="space-y-4 py-4">
                            <div>
                              <label className="text-sm font-semibold block mb-2">
                                Share: {editingShare[0]}%
                              </label>
                              <Slider
                                min={1}
                                max={99}
                                step={1}
                                value={editingShare}
                                onValueChange={setEditingShare}
                              />
                            </div>

                            <div className="p-3 bg-blue-50 rounded border border-blue-200">
                              <p className="text-sm text-blue-900">
                                You will retain{' '}
                                {Math.max(
                                  0,
                                  100 -
                                    (totalShare -
                                      collab.share +
                                      editingShare[0])
                                )}
                                %
                              </p>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleUpdateShare(collab.id)}
                            >
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>
                            Remove Collaborator?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will remove{' '}
                            {collab.name ||
                              `${collab.address.slice(0, 6)}...`}{' '}
                            from your collaboration and they will no longer
                            receive revenue shares.
                          </AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                removeCollaborator(collab.id)
                              }
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Earnings Breakdown */}
                  <div className="ml-0 pt-3 border-t">
                    <p className="text-xs text-gray-600">
                      Earnings: {collab.earnings} ETH (~$
                      {(parseFloat(collab.earnings) * 2500).toFixed(0)})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <Users className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-gray-600">No collaborators yet</p>
              <p className="text-xs text-gray-500">
                Add collaborators to share revenue from your creations
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6 flex gap-4">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-blue-900">
              How Revenue Sharing Works
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • Revenue from your creations is split among all collaborators
                based on their percentage
              </li>
              <li>
                • Changes to percentages apply to future earnings only
              </li>
              <li>
                • Collaborators receive payments automatically with your
                payouts
              </li>
              <li>
                • You can update or remove collaborators at any time
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreatorCollaboratorsPage;
