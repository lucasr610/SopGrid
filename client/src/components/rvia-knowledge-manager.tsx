import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Upload, Search, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface IngestionStatus {
  completed: number;
  total: number;
  manuals: string[];
}

interface SearchResult {
  content: string;
  metadata: any;
  similarity: number;
}

export function RVIAKnowledgeManager() {
  const [status, setStatus] = useState<IngestionStatus | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/rvia/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load RVIA status:', error);
    }
  };

  const triggerIngestion = async () => {
    setIsIngesting(true);
    setMessage(null);
    
    try {
      const response = await apiRequest('POST', '/api/rvia/ingest');
      const data = await response.json();
      
      setMessage({ type: 'success', text: data.message });
      await loadStatus();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to ingest RVIA manuals' 
      });
    } finally {
      setIsIngesting(false);
    }
  };

  const searchKnowledge = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await apiRequest('POST', '/api/rvia/search', { query: searchQuery });
      const data = await response.json();
      
      setSearchResults(data.results || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Search failed' });
    } finally {
      setIsSearching(false);
    }
  };

  const getProgressPercentage = () => {
    if (!status) return 0;
    return Math.round((status.completed / status.total) * 100);
  };

  const getStatusIcon = () => {
    if (!status) return <Clock className="w-4 h-4" />;
    if (status.completed === status.total) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status.completed > 0) return <Upload className="w-4 h-4 text-yellow-500" />;
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold">RVIA Knowledge Management</h2>
      </div>

      {/* Status Card */}
      <Card data-testid="rvia-status-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Training Manual Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status && (
            <>
              <div className="flex items-center justify-between">
                <span>Progress: {status.completed} of {status.total} manuals ingested</span>
                <Badge variant={status.completed === status.total ? "default" : "secondary"}>
                  {getProgressPercentage()}%
                </Badge>
              </div>
              <Progress value={getProgressPercentage()} className="w-full" />
              
              {status.completed < status.total && (
                <Button 
                  onClick={triggerIngestion}
                  disabled={isIngesting}
                  className="w-full"
                  data-testid="button-start-ingestion"
                >
                  {isIngesting ? 'Processing Training Manuals...' : 'Start Knowledge Ingestion'}
                </Button>
              )}

              {status.completed === status.total && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All RVIA training manuals have been successfully integrated into the system memory.
                    The AI agents now have comprehensive RV technical knowledge.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Search */}
      <Card data-testid="rvia-search-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search RVIA Knowledge Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search RV technical procedures, troubleshooting, maintenance..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchKnowledge()}
              data-testid="input-search-query"
            />
            <Button 
              onClick={searchKnowledge}
              disabled={isSearching || !searchQuery.trim()}
              data-testid="button-search-knowledge"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-3" data-testid="search-results">
              <h3 className="font-semibold">Search Results:</h3>
              {searchResults.map((result, index) => (
                <Card key={index} className="bg-slate-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">
                        {result.metadata?.specialtyArea || 'Technical'}
                      </Badge>
                      <Badge variant="secondary">
                        {Math.round(result.similarity * 100)}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      {result.content.substring(0, 300)}...
                    </p>
                    {result.metadata?.title && (
                      <p className="text-xs text-blue-600 font-medium">
                        Source: {result.metadata.title}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual List */}
      {status && status.manuals.length > 0 && (
        <Card data-testid="ingested-manuals-list">
          <CardHeader>
            <CardTitle>Ingested Training Manuals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {status.manuals.map((manual, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{manual}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}