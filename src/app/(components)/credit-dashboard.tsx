'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CreditService, type UserCredits, type CreditTransaction } from '@/lib/credit-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, TrendingUp, TrendingDown, Info, Plus } from 'lucide-react';
import { CreditPurchase } from './credit-purchase';

interface CreditDashboardProps {
  showPurchaseOption?: boolean;
}

export function CreditDashboard({ showPurchaseOption = true }: CreditDashboardProps) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [stats, setStats] = useState<{
    currentCredits: number;
    totalPurchased: number;
    totalUsed: number;
    totalTransactions: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user) {
      loadCreditData();
    }
  }, [user]);

  const loadCreditData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [userCredits, creditTransactions, creditStats] = await Promise.all([
        CreditService.getUserCredits(user.id),
        CreditService.getCreditTransactions(user.id, 50),
        CreditService.getUserCreditStats(user.id)
      ]);
      
      setCredits(userCredits);
      setTransactions(creditTransactions);
      setStats(creditStats);
    } catch (error) {
      console.error('Error loading credit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'bonus':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'usage':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'Kauf';
      case 'usage':
        return 'Verbrauch';
      case 'bonus':
        return 'Bonus';
      case 'refund':
        return 'Rückerstattung';
      default:
        return type;
    }
  };

  const handlePurchaseComplete = () => {
    loadCreditData();
    setActiveTab('overview');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="transactions">Transaktionen</TabsTrigger>
          {showPurchaseOption && (
            <TabsTrigger value="purchase">Credits kaufen</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Credits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Aktuelles Credit-Guthaben
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">
                  {credits?.credits?.toLocaleString('de-DE') || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Credits verfügbar</div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Overview */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Gesamt gekauft</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.totalPurchased.toLocaleString('de-DE')}
                  </div>
                  <p className="text-xs text-muted-foreground">Credits</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Gesamt verbraucht</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {stats.totalUsed.toLocaleString('de-DE')}
                  </div>
                  <p className="text-xs text-muted-foreground">Credits</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Transaktionen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalTransactions.toLocaleString('de-DE')}
                  </div>
                  <p className="text-xs text-muted-foreground">Gesamt</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Low Credits Warning */}
          {credits && credits.credits < 10 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Wenige Credits verfügbar!</strong><br />
                Sie haben nur noch {credits.credits} Credits. Kaufen Sie jetzt Credits, um weiterhin Rechnungen erstellen zu können.
                {showPurchaseOption && (
                  <>
                    <br />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setActiveTab('purchase')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Jetzt Credits kaufen
                    </Button>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaktionshistorie</CardTitle>
              <CardDescription>
                Übersicht über alle Credit-Bewegungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Transaktionen vorhanden
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Typ</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead className="text-right">Änderung</TableHead>
                      <TableHead className="text-right">Saldo danach</TableHead>
                      <TableHead>Datum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.transaction_type)}
                            <Badge variant="outline">
                              {getTransactionTypeLabel(transaction.transaction_type)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.description || 'Keine Beschreibung'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          transaction.credits_change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.credits_change > 0 ? '+' : ''}
                          {transaction.credits_change.toLocaleString('de-DE')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {transaction.credits_balance_after.toLocaleString('de-DE')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {showPurchaseOption && (
          <TabsContent value="purchase">
            <CreditPurchase 
              onPurchaseComplete={handlePurchaseComplete}
              userCredits={credits?.credits || 0}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
