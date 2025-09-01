import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, SortAsc, SortDesc, FileText, Calendar, Tag, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface SearchFilters {
  query: string;
  dateRange: {
    start: string;
    end: string;
  };
  categories: string[];
  safetyLevels: string[];
  compliance: string[];
  authors: string[];
  documentTypes: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  includeArchived: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  type: 'sop' | 'document' | 'manual';
  category: string;
  safetyLevel: string;
  compliance: string[];
  author: string;
  createdAt: string;
  lastModified: string;
  excerpt: string;
  relevanceScore: number;
  tags: string[];
}

const SAFETY_LEVELS = ['low', 'medium', 'high', 'critical'];
const COMPLIANCE_STANDARDS = ['OSHA', 'EPA', 'DOT', 'FDA', 'DOD', 'NFPA', 'IEEE', 'ASME'];
const DOCUMENT_TYPES = ['service_manual', 'install_guide', 'owner_manual', 'tech_reference', 'sop'];
const CATEGORIES = ['electrical', 'mechanical', 'safety', 'compliance', 'general', 'troubleshooting'];

export function AdvancedSearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    dateRange: { start: '', end: '' },
    categories: [],
    safetyLevels: [],
    compliance: [],
    authors: [],
    documentTypes: [],
    sortBy: 'relevance',
    sortOrder: 'desc',
    includeArchived: false
  });

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();

  // Fetch available authors
  const { data: authors = [] } = useQuery({
    queryKey: ['/api/search/authors'],
    enabled: showAdvanced
  });

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const addArrayFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: [...(prev[key] as string[]), value]
    }));
  };

  const removeArrayFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: (prev[key] as string[]).filter(item => item !== value)
    }));
  };

  const performSearch = async () => {
    if (!filters.query.trim() && filters.categories.length === 0 && filters.documentTypes.length === 0) {
      toast({
        title: "Search Required",
        description: "Please enter a search query or select filters",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      const searchParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            searchParams.append(key, value.join(','));
          }
        } else if (typeof value === 'object' && value !== null) {
          // Handle dateRange object
          if (key === 'dateRange') {
            if (value.start) searchParams.append('dateStart', value.start);
            if (value.end) searchParams.append('dateEnd', value.end);
          }
        } else if (value) {
          searchParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/search/advanced?${searchParams.toString()}`);
      if (!response.ok) throw new Error('Search failed');

      const results = await response.json();
      setSearchResults(results.items || []);
      
      toast({
        title: "Search Complete",
        description: `Found ${results.items?.length || 0} results`,
      });
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "An error occurred while searching",
        variant: "destructive"
      });
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      dateRange: { start: '', end: '' },
      categories: [],
      safetyLevels: [],
      compliance: [],
      authors: [],
      documentTypes: [],
      sortBy: 'relevance',
      sortOrder: 'desc',
      includeArchived: false
    });
    setSearchResults([]);
  };

  const activeFiltersCount = useMemo(() => {
    return filters.categories.length + 
           filters.safetyLevels.length + 
           filters.compliance.length + 
           filters.authors.length + 
           filters.documentTypes.length +
           (filters.dateRange.start || filters.dateRange.end ? 1 : 0) +
           (filters.includeArchived ? 1 : 0);
  }, [filters]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Advanced Search</h2>
          <p className="text-gray-400">Intelligent search across SOPs, manuals, and documents</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-cyan-400 border-cyan-400">
            {searchResults.length} Results
          </Badge>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">
              {activeFiltersCount} Active Filters
            </Badge>
          )}
        </div>
      </div>

      <Card className="bg-gray-900/50 border-cyan-500/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-cyan-400">Search Parameters</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              data-testid="button-toggle-advanced"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showAdvanced ? 'Simple' : 'Advanced'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search SOPs, manuals, and documents..."
                value={filters.query}
                onChange={(e) => updateFilter('query', e.target.value)}
                className="bg-gray-800 border-cyan-500/50 text-white text-lg h-12"
                data-testid="input-search-query"
              />
            </div>
            <Button 
              onClick={performSearch} 
              disabled={isSearching}
              className="bg-cyan-600 hover:bg-cyan-700 h-12 px-8"
              data-testid="button-perform-search"
            >
              <Search className="h-5 w-5 mr-2" />
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {showAdvanced && (
            <Tabs defaultValue="filters" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-900/50">
                <TabsTrigger value="filters">Filters</TabsTrigger>
                <TabsTrigger value="sorting">Sorting</TabsTrigger>
                <TabsTrigger value="date-range">Date Range</TabsTrigger>
              </TabsList>

              <TabsContent value="filters" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-gray-300">Categories</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(category => (
                        <Badge
                          key={category}
                          variant={filters.categories.includes(category) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            if (filters.categories.includes(category)) {
                              removeArrayFilter('categories', category);
                            } else {
                              addArrayFilter('categories', category);
                            }
                          }}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-gray-300">Safety Levels</Label>
                    <div className="flex flex-wrap gap-2">
                      {SAFETY_LEVELS.map(level => (
                        <Badge
                          key={level}
                          variant={filters.safetyLevels.includes(level) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            if (filters.safetyLevels.includes(level)) {
                              removeArrayFilter('safetyLevels', level);
                            } else {
                              addArrayFilter('safetyLevels', level);
                            }
                          }}
                        >
                          {level}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-gray-300">Compliance Standards</Label>
                    <div className="flex flex-wrap gap-2">
                      {COMPLIANCE_STANDARDS.map(standard => (
                        <Badge
                          key={standard}
                          variant={filters.compliance.includes(standard) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            if (filters.compliance.includes(standard)) {
                              removeArrayFilter('compliance', standard);
                            } else {
                              addArrayFilter('compliance', standard);
                            }
                          }}
                        >
                          {standard}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-gray-300">Document Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {DOCUMENT_TYPES.map(type => (
                        <Badge
                          key={type}
                          variant={filters.documentTypes.includes(type) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            if (filters.documentTypes.includes(type)) {
                              removeArrayFilter('documentTypes', type);
                            } else {
                              addArrayFilter('documentTypes', type);
                            }
                          }}
                        >
                          {type.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-archived"
                    checked={filters.includeArchived}
                    onCheckedChange={(checked) => updateFilter('includeArchived', checked)}
                  />
                  <Label htmlFor="include-archived" className="text-gray-300">
                    Include archived documents
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="sorting" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Sort By</Label>
                    <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
                      <SelectTrigger className="bg-gray-800 border-cyan-500/50 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="createdAt">Created Date</SelectItem>
                        <SelectItem value="lastModified">Last Modified</SelectItem>
                        <SelectItem value="safetyLevel">Safety Level</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Sort Order</Label>
                    <Select value={filters.sortOrder} onValueChange={(value) => updateFilter('sortOrder', value)}>
                      <SelectTrigger className="bg-gray-800 border-cyan-500/50 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">
                          <div className="flex items-center">
                            <SortDesc className="h-4 w-4 mr-2" />
                            Descending
                          </div>
                        </SelectItem>
                        <SelectItem value="asc">
                          <div className="flex items-center">
                            <SortAsc className="h-4 w-4 mr-2" />
                            Ascending
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="date-range" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Start Date</Label>
                    <Input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                      className="bg-gray-800 border-cyan-500/50 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">End Date</Label>
                    <Input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                      className="bg-gray-800 border-cyan-500/50 text-white"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
              Clear All Filters
            </Button>
            <div className="text-sm text-gray-400">
              Press Enter to search or use the Search button
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      <div className="grid grid-cols-1 gap-4">
        {searchResults.map((result) => (
          <Card key={result.id} className="bg-gray-900/50 border-gray-700 hover:border-cyan-500/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-4 w-4 text-cyan-400" />
                    <h3 className="font-semibold text-white">{result.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {result.type}
                    </Badge>
                    <Badge 
                      variant={result.safetyLevel === 'critical' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {result.safetyLevel}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{result.excerpt}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {result.author}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(result.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Tag className="h-3 w-3 mr-1" />
                      {result.category}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                    {Math.round(result.relevanceScore * 100)}% match
                  </Badge>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {result.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {searchResults.length === 0 && filters.query && !isSearching && (
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No Results Found</h3>
              <p className="text-gray-400">Try adjusting your search criteria or filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}