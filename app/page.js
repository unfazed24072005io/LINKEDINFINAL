'use client';
import { useState } from 'react';
import { 
  Search, Download, User, MapPin, Building, Users, Target, 
  Mail, Phone, Globe, Shield, Zap, Star, Crown, Rocket,
  CheckCircle, XCircle, Filter, SortAsc, Sparkles,
  Calendar, Briefcase, Award
} from 'lucide-react';

export default function Home() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apolloLoading, setApolloLoading] = useState(false);
  const [searchData, setSearchData] = useState({
    designation: '',
    location: ''
  });
  const [filters, setFilters] = useState({
    verified: false,
    highConfidence: false
  });

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!searchData.designation || !searchData.location) return;
    
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData),
      });

      const data = await response.json();
      if (data.success) {
        setProfiles(data.profiles);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApolloEnrichment = async () => {
    if (!profiles.length) return;
    
    setApolloLoading(true);
    try {
      const response = await fetch('/.netlify/functions/apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles }),
      });

      const data = await response.json();
      if (data.success) {
        setProfiles(data.profiles);
      } else {
        alert(`Apollo enrichment failed: ${data.error}`);
      }
    } catch (error) {
      alert('Apollo enrichment failed. Please try again.');
    } finally {
      setApolloLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!profiles.length) return;
    
    const headers = ['Name', 'Title', 'Location', 'Company', 'Email', 'Phone', 'Profile URL', 'Confidence', 'Apollo ID'];
    const csvData = profiles.map(p => [
      p.name, 
      p.title, 
      p.location, 
      p.company, 
      p.verifiedEmail || p.email, 
      p.directPhone || 'N/A', 
      p.profileUrl,
      p.confidence || 'unknown',
      p.apolloId || 'N/A'
    ]);
    const csvContent = [headers.join(','), ...csvData.map(row => row.map(field => `"${field}"`).join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enriched_profiles_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredProfiles = profiles.filter(profile => {
    if (filters.verified && !profile.apolloEnriched) return false;
    if (filters.highConfidence && profile.confidence !== 'high') return false;
    return true;
  });

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      case 'low': return 'bg-red-500/20 text-red-300 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  const getDataIndicator = (hasData, type) => {
    if (hasData) {
      return (
        <div className={`flex items-center space-x-1 ${
          type === 'email' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
          type === 'phone' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
          'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
        } px-2 py-1 rounded-lg`}>
          {type === 'email' && <Mail className="h-3 w-3" />}
          {type === 'phone' && <Phone className="h-3 w-3" />}
          {type === 'location' && <MapPin className="h-3 w-3" />}
          <span className="text-xs font-medium">
            {type === 'email' ? 'Email' : type === 'phone' ? 'Phone' : 'Location'}
          </span>
          <CheckCircle className="h-3 w-3" />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Enhanced Header */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  <Rocket className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">ProspectFind</h1>
                <p className="text-sm text-cyan-200">AI-Powered Professional Intelligence</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-cyan-200">
                <Shield className="h-4 w-4" />
                <span className="text-sm">Secure</span>
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 mb-6 border border-white/20">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <span className="text-cyan-200 text-sm font-medium">Powered by Apollo.io</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Find <span className="text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text">Perfect</span> Prospects
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            AI-powered LinkedIn intelligence enriched with Apollo.io verified data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          
          {/* Enhanced Search Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl sticky top-8">
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-5 w-5 text-cyan-300" />
                  <h2 className="text-lg font-semibold text-white">Search Criteria</h2>
                </div>
                <p className="text-sm text-gray-300">Find professionals with precision</p>
              </div>

              <form onSubmit={handleScrape} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={searchData.designation}
                    onChange={(e) => setSearchData({...searchData, designation: e.target.value})}
                    placeholder="e.g., CEO, Marketing Manager"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-white placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={searchData.location}
                    onChange={(e) => setSearchData({...searchData, location: e.target.value})}
                    placeholder="e.g., New York, London"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-white placeholder-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !searchData.designation || !searchData.location}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center shadow-lg shadow-cyan-500/25"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Scanning...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Search className="h-4 w-4 mr-2" />
                      Find Prospects
                    </div>
                  )}
                </button>
              </form>

              {profiles.length > 0 && (
                <div className="space-y-3 mt-6">
                  <button
                    onClick={handleApolloEnrichment}
                    disabled={apolloLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all transform hover:scale-105 flex items-center justify-center shadow-lg shadow-purple-500/25"
                  >
                    {apolloLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enriching...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Zap className="h-4 w-4 mr-2" />
                        Apollo Enrichment
                      </div>
                    )}
                  </button>

                  <button
                    onClick={exportToCSV}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 flex items-center justify-center shadow-lg shadow-green-500/25"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV ({profiles.length})
                  </button>
                </div>
              )}

              {/* Filters */}
              {profiles.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/20">
                  <h3 className="text-sm font-semibold text-cyan-200 mb-3 flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={filters.verified}
                        onChange={(e) => setFilters({...filters, verified: e.target.checked})}
                        className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span>Apollo Verified Only</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={filters.highConfidence}
                        onChange={(e) => setFilters({...filters, highConfidence: e.target.checked})}
                        className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span>High Confidence Only</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Results */}
          <div className="lg:col-span-3">
            {filteredProfiles.length > 0 ? (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-white/20 bg-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-semibold text-white">
                        Enriched Profiles
                      </h3>
                      <span className="bg-cyan-500/20 text-cyan-300 text-sm font-medium px-3 py-1 rounded-full border border-cyan-500/30">
                        {filteredProfiles.length} results
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-cyan-200">
                      <SortAsc className="h-4 w-4" />
                      <span className="text-sm">Sorted by Relevance</span>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-white/10">
                  {filteredProfiles.map((profile) => (
                    <div key={profile.id} className="p-6 hover:bg-white/5 transition-all group border-l-4 border-l-cyan-500/50">
                      <div className="flex items-start space-x-4">
                        <div className="relative">
                          <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          {profile.apolloEnriched && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg">
                              <Crown className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-xl font-bold text-white group-hover:text-cyan-200 transition-colors">
                                  {profile.name}
                                </h4>
                                {profile.confidence && (
                                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getConfidenceColor(profile.confidence)}`}>
                                    {profile.confidence} confidence
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-300 mb-3">
                                <div className="flex items-center">
                                  <Briefcase className="h-4 w-4 mr-2 text-cyan-300" />
                                  <span className="font-medium">{profile.title}</span>
                                  {profile.company && <span className="ml-1">• {profile.company}</span>}
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2 text-cyan-300" />
                                  <span>{profile.location}</span>
                                </div>
                              </div>

                              {/* Apollo Data Indicators */}
                              {profile.apolloEnriched && (
                                <div className="flex items-center space-x-3 mb-3">
                                  {getDataIndicator(profile.hasEmail, 'email')}
                                  {getDataIndicator(profile.hasDirectPhone === "Yes", 'phone')}
                                  {getDataIndicator(profile.locationData?.city, 'location')}
                                  
                                  {profile.lastRefreshed && (
                                    <div className="flex items-center space-x-1 bg-gray-500/20 text-gray-300 px-2 py-1 rounded-lg border border-gray-500/30">
                                      <Calendar className="h-3 w-3" />
                                      <span className="text-xs font-medium">
                                        {new Date(profile.lastRefreshed).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              {profile.apolloUrl && (
                                <a 
                                  href={profile.apolloUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-2 rounded-xl transition-all border border-purple-500/30 hover:border-purple-400/50"
                                >
                                  <Award className="h-4 w-4" />
                                  <span className="text-sm">Apollo</span>
                                </a>
                              )}
                              <a 
                                href={profile.profileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl transition-all border border-white/20 hover:border-cyan-500/50"
                              >
                                <User className="h-4 w-4" />
                                <span className="text-sm">LinkedIn</span>
                              </a>
                            </div>
                          </div>

                          {/* Contact Information (if available) */}
                          {(profile.verifiedEmail || profile.directPhone) && (
                            <div className="flex items-center space-x-6 mt-4 pt-4 border-t border-white/10">
                              {profile.verifiedEmail && (
                                <div className="flex items-center space-x-2 text-green-400">
                                  <Mail className="h-4 w-4" />
                                  <span className="text-sm font-mono bg-green-500/10 px-2 py-1 rounded border border-green-500/30">
                                    {profile.verifiedEmail}
                                  </span>
                                  <CheckCircle className="h-3 w-3" />
                                </div>
                              )}
                              {profile.directPhone && (
                                <div className="flex items-center space-x-2 text-blue-400">
                                  <Phone className="h-4 w-4" />
                                  <span className="text-sm font-medium bg-blue-500/10 px-2 py-1 rounded border border-blue-500/30">
                                    {profile.directPhone}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Apollo Metadata */}
                          {profile.apolloEnriched && profile.apolloId && (
                            <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-white/10">
                              <div className="text-xs text-gray-400">
                                Apollo ID: <span className="font-mono text-cyan-300">{profile.apolloId}</span>
                              </div>
                              <div className="text-xs text-gray-400">
                                Source: <span className="text-green-300">Apollo.io</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : profiles.length > 0 ? (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-12 text-center shadow-2xl">
                <div className="max-w-md mx-auto">
                  <Filter className="h-16 w-16 text-cyan-300 mx-auto mb-6 opacity-50" />
                  <h3 className="text-2xl font-bold text-white mb-3">
                    No Matching Profiles
                  </h3>
                  <p className="text-gray-400 text-lg">
                    Try adjusting your filters to see more results
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-12 text-center shadow-2xl">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-cyan-500/30">
                    <Search className="h-10 w-10 text-cyan-300" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">
                    Ready to Discover
                  </h3>
                  <p className="text-gray-300 text-lg mb-6">
                    Enter search criteria to find and enrich professional profiles with Apollo.io intelligence
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-cyan-200">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm">Secure</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm">Fast</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4" />
                      <span className="text-sm">Accurate</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}