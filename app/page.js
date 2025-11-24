'use client';
import { useState } from 'react';
import { 
  Search, Download, User, MapPin, Building, Mail, Phone, 
  Zap, Shield, Sparkles, Filter, Crown, CheckCircle, XCircle 
} from 'lucide-react';

export default function Home() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apolloLoading, setApolloLoading] = useState(false);
  const [searchData, setSearchData] = useState({
    designation: '',
    location: ''
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
        alert(`Error: ${data.error}${data.note ? '\n' + data.note : ''}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
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
        if (data.note) {
          console.log('Note:', data.note);
        }
      } else {
        alert(`Apollo enrichment failed: ${data.error}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    } finally {
      setApolloLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!profiles.length) return;
    
    const headers = ['Name', 'Title', 'Location', 'Company', 'Email', 'Phone', 'Profile URL'];
    const csvData = profiles.map(p => [
      p.name, 
      p.title, 
      p.location, 
      p.company, 
      p.verifiedEmail || 'Not available', 
      p.directPhone || 'Not available', 
      p.profileUrl
    ]);
    const csvContent = [headers, ...csvData].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospects_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      case 'low': return 'bg-red-500/20 text-red-300 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">ProspectFind</h1>
                <p className="text-sm text-cyan-200">LinkedIn Intelligence Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-cyan-200">
                <Shield className="h-4 w-4" />
                <span className="text-sm">Secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 glass rounded-2xl px-4 py-2 mb-6">
            <Zap className="h-4 w-4 text-cyan-300" />
            <span className="text-cyan-200 text-sm font-medium">Powered by Apollo.io</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Find Perfect <span className="text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text">Prospects</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Discover and enrich LinkedIn profiles with verified contact information
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 sticky top-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">Search Criteria</h2>
                <p className="text-sm text-gray-300">Find professionals worldwide</p>
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-400"
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !searchData.designation || !searchData.location}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 transition-all flex items-center justify-center"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Searching...
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
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all flex items-center justify-center"
                  >
                    {apolloLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enriching...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Zap className="h-4 w-4 mr-2" />
                        Get Contact Details
                      </div>
                    )}
                  </button>

                  <button
                    onClick={exportToCSV}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV ({profiles.length})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-3">
            {profiles.length > 0 ? (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/20 bg-white/5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      Found Profiles
                    </h3>
                    <span className="bg-cyan-500/20 text-cyan-300 text-sm px-3 py-1 rounded-full">
                      {profiles.length} results
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-white/10">
                  {profiles.map((profile) => (
                    <div key={profile.id} className="p-6 hover:bg-white/5 transition-all">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                            {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          {profile.apolloEnriched && (
                            <div className="flex justify-center mt-2">
                              <Crown className="h-4 w-4 text-yellow-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-bold text-white">
                                  {profile.name}
                                </h4>
                                {profile.confidence && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(profile.confidence)}`}>
                                    {profile.confidence}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-4 text-sm text-gray-300 mb-3">
                                <div className="flex items-center">
                                  <Building className="h-4 w-4 mr-2" />
                                  <span>{profile.title}</span>
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2" />
                                  <span>{profile.location}</span>
                                </div>
                              </div>

                              {/* Contact Information - ALWAYS VISIBLE */}
                              <div className="space-y-2 mt-4">
                                <div className="flex items-center space-x-4">
                                  {/* Email */}
                                  <div className={`flex items-center space-x-2 ${profile.verifiedEmail ? 'text-green-400' : 'text-gray-400'}`}>
                                    <Mail className="h-4 w-4" />
                                    <span className="text-sm">
                                      {profile.verifiedEmail || 'Email not available'}
                                    </span>
                                    {profile.verifiedEmail && <CheckCircle className="h-3 w-3" />}
                                  </div>

                                  {/* Phone */}
                                  <div className={`flex items-center space-x-2 ${profile.directPhone ? 'text-blue-400' : 'text-gray-400'}`}>
                                    <Phone className="h-4 w-4" />
                                    <span className="text-sm">
                                      {profile.directPhone || 'Phone not available'}
                                    </span>
                                    {profile.directPhone && <CheckCircle className="h-3 w-3" />}
                                  </div>
                                </div>
                              </div>

                              {/* Apollo Status */}
                              {profile.apolloEnriched === false && (
                                <div className="flex items-center space-x-2 mt-3">
                                  <div className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded text-xs border border-orange-500/30">
                                    Click "Get Contact Details" to enrich
                                  </div>
                                </div>
                              )}
                            </div>

                            <a 
                              href={profile.profileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2 ml-4"
                            >
                              <User className="h-4 w-4" />
                              <span>Profile</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
                  <Search className="h-8 w-8 text-cyan-300" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Ready to Discover</h3>
                <p className="text-gray-300 mb-6">Enter search criteria to find professional profiles</p>
                <div className="flex items-center justify-center space-x-4 text-cyan-200">
                  <div className="flex items-center space-x-1">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">Secure</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">Fast</span>
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